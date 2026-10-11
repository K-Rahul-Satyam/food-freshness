"""
Food Image Analysis Engine
Computer Vision and Machine Learning pipeline for food freshness detection,
color degradation, surface texture analysis, spoilage identification (mold, bruising, damage),
multi-factor freshness assessment scoring, and shelf-life trend forecasting.

Technologies: OpenCV, NumPy, SciPy, Scikit-learn, PIL.
"""

import cv2
import numpy as np
from PIL import Image, ImageDraw
import io
import base64
import math
from typing import Dict, Any, List, Tuple, Optional

# Standard Freshness Categories
CATEGORY_FRESH = "Fresh"
CATEGORY_GOOD = "Good"
CATEGORY_ACCEPTABLE = "Acceptable"
CATEGORY_NEAR_SPOILAGE = "Near Spoilage"
CATEGORY_SPOILED = "Spoiled"

# Quality Grades
GRADE_A = "Grade A - Premium"
GRADE_B = "Grade B - Good Standard"
GRADE_C = "Grade C - Acceptable"
GRADE_D = "Grade D - Substandard"
GRADE_F = "Grade F - Reject"


def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    """Decode raw image bytes into an OpenCV BGR numpy array."""
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image from provided bytes.")
    return image


def preprocess_and_segment(image_bgr: np.ndarray, max_dim: int = 640) -> Tuple[np.ndarray, np.ndarray]:
    """
    Resize image to standardized dimension and segment food foreground mask from background.
    Returns: (preprocessed_bgr, foreground_mask_binary)
    """
    h, w = image_bgr.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(image_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)
    else:
        resized = image_bgr.copy()

    # Convert to HSV & Lab
    hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

    # Blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)

    # Otsu thresholding + Saturation check to isolate food from plain white/dark/metal backgrounds
    _, otsu_thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Saturation threshold: food items typically have color saturation > 15
    sat_mask = (hsv[:, :, 1] > 20).astype(np.uint8) * 255
    
    combined = cv2.bitwise_or(otsu_thresh, sat_mask)
    
    # Morphological cleaning
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    cleaned = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel, iterations=2)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel, iterations=1)

    # Ensure mask covers at least 15% of image; if background was complex, default to center elliptical ROI
    fg_coverage = np.sum(cleaned > 0) / float(cleaned.size)
    if fg_coverage < 0.10 or fg_coverage > 0.95:
        # Fallback: create soft elliptical center mask
        cleaned = np.zeros(cleaned.shape, dtype=np.uint8)
        cv2.ellipse(cleaned, (cleaned.shape[1]//2, cleaned.shape[0]//2), 
                    (int(cleaned.shape[1]*0.42), int(cleaned.shape[0]*0.42)), 
                    0, 0, 360, 255, -1)

    return resized, cleaned


def analyze_color_degradation(image_bgr: np.ndarray, mask: np.ndarray) -> Dict[str, Any]:
    """
    Analyze color degradation and browning index with produce-aware colorimetry.
    Differentiates healthy carotenoids (orange/red) and chlorophyll (green) from true necrotic rot.
    """
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)

    valid_pixels_mask = mask > 0
    if not np.any(valid_pixels_mask):
        return {
            "browning_index": 5.0,
            "color_degradation_pct": 2.0,
            "mean_lightness": 60.0,
            "mean_saturation": 120.0,
            "chromatic_shift": 10.0,
            "dominant_hex": "#50B050"
        }

    L_vals = lab[:, :, 0][valid_pixels_mask].astype(float) * (100.0 / 255.0)  # Standard 0-100 scale
    a_vals = lab[:, :, 1][valid_pixels_mask].astype(float) - 128.0            # Standard -128 to +127
    b_vals = lab[:, :, 2][valid_pixels_mask].astype(float) - 128.0            # Standard -128 to +127

    mean_L = float(np.mean(L_vals))
    mean_a = float(np.mean(a_vals))
    mean_b = float(np.mean(b_vals))

    h_channel = hsv[:, :, 0][valid_pixels_mask]
    s_channel = hsv[:, :, 1][valid_pixels_mask]
    v_channel = hsv[:, :, 2][valid_pixels_mask]

    mean_h = float(np.mean(h_channel))
    mean_sat = float(np.mean(s_channel))
    chromatic_shift = round(math.sqrt(mean_a**2 + mean_b**2), 1)

    # Detect Food Color Profile
    is_carotenoid = (mean_h <= 26 or mean_h >= 165) and mean_sat > 65
    is_green = (mean_h >= 32 and mean_h <= 95) and mean_sat > 40

    if is_carotenoid:
        # Orange/Red produce: Carrots, Tomatoes, Oranges, Peppers
        # High saturation indicates high antioxidant & beta-carotene retention (healthy)
        # Browning/rot only occurs when pixels turn dark, muddy, or desaturated
        rot_pixels = ((v_channel < 48) | ((s_channel < 55) & (v_channel < 90)))
        discoloration_ratio = float(np.sum(rot_pixels)) / float(len(h_channel))
        browning_index = round(min(100.0, discoloration_ratio * 300.0), 1)
        sat_freshness_bonus = max(0.0, (mean_sat - 120.0) / 100.0) * 5.0
        color_degradation_pct = round(max(0.0, min(100.0, discoloration_ratio * 120.0 - sat_freshness_bonus)), 1)
    elif is_green:
        # Green produce: Spinach, Cucumber, Broccoli, Lettuce
        yellowing = ((h_channel < 30) | (h_channel > 95)) & (s_channel > 40)
        rot = (v_channel < 40)
        yellow_ratio = float(np.sum(yellowing)) / float(len(h_channel))
        rot_ratio = float(np.sum(rot)) / float(len(h_channel))
        color_degradation_pct = round(min(100.0, yellow_ratio * 60.0 + rot_ratio * 100.0), 1)
        browning_index = round(min(100.0, rot_ratio * 200.0), 1)
    else:
        # White / Pale flesh produce: Apple slices, Bananas, Potatoes, Mushrooms
        # Standard Enzymic Browning Index (BI) Formula (Buera et al.):
        denom = 5.645 * mean_L + mean_a - 3.012 * mean_b
        if abs(denom) < 1e-4:
            denom = 1e-4
        x_val = (mean_a + 1.75 * mean_L) / denom
        raw_bi = 100.0 * (x_val - 0.31) / 0.172
        browning_index = round(max(0.0, min(100.0, raw_bi)), 1)

        brown_mask = ((h_channel >= 5) & (h_channel <= 25) & (v_channel < 110)) | (v_channel < 45)
        discoloration_ratio = float(np.sum(brown_mask)) / float(len(h_channel))
        color_degradation_pct = round(min(100.0, (discoloration_ratio * 70.0 + browning_index * 0.35)), 1)

    # Average RGB for dominant color display
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    mean_r = int(np.mean(rgb[:, :, 0][valid_pixels_mask]))
    mean_g = int(np.mean(rgb[:, :, 1][valid_pixels_mask]))
    mean_b_rgb = int(np.mean(rgb[:, :, 2][valid_pixels_mask]))
    dominant_hex = f"#{mean_r:02x}{mean_g:02x}{mean_b_rgb:02x}"

    return {
        "browning_index": round(browning_index, 1),
        "color_degradation_pct": color_degradation_pct,
        "mean_lightness": round(mean_L, 1),
        "mean_saturation": round(mean_sat, 1),
        "chromatic_shift": chromatic_shift,
        "dominant_hex": dominant_hex
    }


def analyze_surface_texture(image_bgr: np.ndarray, mask: np.ndarray) -> Dict[str, Any]:
    """
    Extract surface texture changes, roughness, and wrinkling using gradient variance,
    Laplacian energy, and local entropy. Calibrated to avoid penalizing crisp in-focus photos.
    """
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    valid_pixels = mask > 0
    if not np.any(valid_pixels):
        return {
            "texture_degradation_pct": 3.0,
            "roughness_index": 5.0,
            "shrivel_index": 3.0,
            "entropy": 4.5,
            "laplacian_variance": 50.0
        }

    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    lap_vals = laplacian[valid_pixels]
    lap_var = float(np.var(lap_vals))

    # Sobel gradient for micro-wrinkles
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    gradient_mag = np.sqrt(sobel_x**2 + sobel_y**2)
    grad_vals = gradient_mag[valid_pixels]
    roughness = float(np.mean(grad_vals))

    # Local Gray-Level Entropy
    hist, _ = np.histogram(gray[valid_pixels], bins=32, range=(0, 256), density=True)
    hist = hist[hist > 0]
    entropy = -float(np.sum(hist * np.log2(hist)))

    # Shrivel index based on high frequency gradient density across skin
    high_grad_ratio = float(np.sum(grad_vals > 55.0)) / float(len(grad_vals))
    shrivel_index = min(100.0, high_grad_ratio * 80.0)

    # Composite texture degradation %: calibrated so clean, sharp photos are not penalized
    texture_degradation_pct = round(min(100.0, (shrivel_index * 0.6 + max(0.0, roughness - 40.0) * 0.5)), 1)

    return {
        "texture_degradation_pct": texture_degradation_pct,
        "roughness_index": round(roughness, 1),
        "shrivel_index": round(shrivel_index, 1),
        "entropy": round(entropy, 2),
        "laplacian_variance": round(lap_var, 1)
    }


def detect_mold_colonies(image_bgr: np.ndarray, mask: np.ndarray) -> Tuple[Dict[str, Any], np.ndarray]:
    """
    Detect fuzzy mycelium patches, mold spore colonies, and microbial growth.
    Excludes natural trimmed root cores, stem crowns, and garlic skins.
    Returns: (metrics_dict, mold_binary_mask)
    """
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    
    h = hsv[:, :, 0]
    s = hsv[:, :, 1]
    v = hsv[:, :, 2]

    valid = mask > 0
    mean_h = float(np.mean(h[valid])) if np.any(valid) else 0
    mean_s = float(np.mean(s[valid])) if np.any(valid) else 0
    is_carotenoid = (mean_h <= 26 or mean_h >= 165) and mean_s > 65

    # 1. Greenish/bluish mycelium (Penicillium digitatum, Cladosporium)
    green_mold = (h >= 35) & (h <= 110) & (s >= 30) & (s <= 140) & (v >= 50) & (v <= 180) & valid

    # 2. Dark black mold (Aspergillus niger)
    black_mold = (v < 28) & valid

    # 3. White / Grey cottony mold (Botrytis, Sclerotinia, Rhizopus)
    # Real mold exhibits high local micro-contrast / fuzzy texture, unlike smooth trimmed root cores
    lap = np.abs(cv2.Laplacian(gray, cv2.CV_64F))
    if is_carotenoid:
        # Exclude clean, light yellow/cream trimmed carrot crowns
        fuzzy_white_mold = (s < 40) & (v > 90) & (v < 210) & (lap > 30.0) & ((h < 12) | (h > 40)) & valid
    else:
        fuzzy_white_mold = (s < 50) & (v > 120) & (v < 235) & (lap > 20.0) & valid

    potential_mold = (white_mold_flag := (green_mold | black_mold | fuzzy_white_mold))
    potential_mold = potential_mold.astype(np.uint8) * 255

    # Filter single pixel noise with morphological opening
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    cleaned_mold = cv2.morphologyEx(potential_mold, cv2.MORPH_OPEN, kernel)
    cleaned_mold = cv2.morphologyEx(cleaned_mold, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(cleaned_mold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    valid_colonies = []
    total_colony_area = 0
    fg_area = max(1.0, float(np.sum(mask > 0)))

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area >= 35:
            valid_colonies.append(cnt)
            total_colony_area += area

    colony_count = len(valid_colonies)
    infected_area_pct = round((total_colony_area / fg_area) * 100.0, 2)
    mold_severity_pct = round(min(100.0, infected_area_pct * 8.0 + (colony_count * 5.0)), 1)
    mold_detected = colony_count > 0 and mold_severity_pct > 3.0

    return {
        "mold_detected": mold_detected,
        "colony_count": colony_count,
        "infected_area_pct": infected_area_pct,
        "mold_severity_pct": mold_severity_pct
    }, cleaned_mold


def detect_bruising(image_bgr: np.ndarray, mask: np.ndarray, mold_mask: np.ndarray) -> Tuple[Dict[str, Any], np.ndarray]:
    """
    Detect sub-surface tissue softening, internal necrosis, and dark pigment pooling bruises.
    Distinguishes natural 3D curvature shadows from actual tissue damage.
    Returns: (metrics_dict, bruise_binary_mask)
    """
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    L = lab[:, :, 0].astype(float)
    s = hsv[:, :, 1].astype(float)
    v = hsv[:, :, 2].astype(float)

    valid = (mask > 0) & (mold_mask == 0)
    if not np.any(valid):
        return {
            "bruise_detected": False,
            "bruise_severity_pct": 0.0,
            "affected_tissue_pct": 0.0,
            "bruise_patches_count": 0
        }, np.zeros(mask.shape, dtype=np.uint8)

    h_channel = hsv[:, :, 0][valid]
    mean_h = float(np.mean(h_channel))
    mean_s = float(np.mean(s[valid]))
    is_carotenoid = (mean_h <= 26 or mean_h >= 165) and mean_s > 65
    is_green = (mean_h >= 32 and mean_h <= 95) and mean_s > 40

    # Shadows preserve underlying high saturation. Real bruises lose saturation and darken!
    if is_carotenoid:
        bruise_candidate = (L < 65) & (s < 85) & (v < 90) & valid
    elif is_green:
        bruise_candidate = (L < 45) & (s < 60) & valid
    else:
        mean_L = np.mean(L[valid])
        std_L = np.std(L[valid])
        bruise_candidate = (L < (mean_L - 1.6 * std_L)) & (s < 85) & valid

    bruise_candidate = bruise_candidate.astype(np.uint8) * 255

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    cleaned_bruise = cv2.morphologyEx(bruise_candidate, cv2.MORPH_OPEN, kernel)
    cleaned_bruise = cv2.morphologyEx(cleaned_bruise, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(cleaned_bruise, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_bruises = [c for c in contours if cv2.contourArea(c) > 75]
    
    bruise_area = sum(cv2.contourArea(c) for c in valid_bruises)
    fg_area = max(1.0, float(np.sum(mask > 0)))
    affected_tissue_pct = round((bruise_area / fg_area) * 100.0, 2)
    bruise_severity_pct = round(min(100.0, affected_tissue_pct * 4.0 + len(valid_bruises) * 3.5), 1)

    return {
        "bruise_detected": len(valid_bruises) > 0 and bruise_severity_pct > 4.0,
        "bruise_severity_pct": bruise_severity_pct,
        "affected_tissue_pct": affected_tissue_pct,
        "bruise_patches_count": len(valid_bruises)
    }, cleaned_bruise


def detect_physical_damage(image_bgr: np.ndarray, mask: np.ndarray) -> Tuple[Dict[str, Any], np.ndarray]:
    """
    Detect structural fractures, cuts, punctures, skin tears, and perimeter deformities.
    Distinguishes deep cuts from normal horizontal skin lenticels or produce bundle boundaries.
    Returns: (metrics_dict, damage_binary_mask)
    """
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    v = hsv[:, :, 2]
    
    # Canny edge detection with calibrated thresholds
    edges = cv2.Canny(gray, 95, 230)
    
    # Erode the mask well inside to avoid counting outer silhouette or inter-produce contours
    kernel_erode = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    inner_mask = cv2.erode(mask, kernel_erode)

    # Real structural cuts are deep, dark crevices, not bright surface lines or normal skin texture
    dark_edges = (edges > 0) & (inner_mask > 0) & (v < 115)
    dark_edges = dark_edges.astype(np.uint8) * 255

    kernel_line = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated_edges = cv2.dilate(dark_edges, kernel_line, iterations=1)

    contours, _ = cv2.findContours(dilated_edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_cuts = []
    total_cut_length = 0

    for cnt in contours:
        perimeter = cv2.arcLength(cnt, True)
        if perimeter > 35:
            valid_cuts.append(cnt)
            total_cut_length += perimeter

    damage_count = len(valid_cuts)
    fg_area = max(1.0, float(np.sum(mask > 0)))
    damage_ratio = total_cut_length / math.sqrt(fg_area)
    damage_severity_pct = round(min(100.0, damage_ratio * 3.5 + damage_count * 2.0), 1)

    return {
        "damage_detected": damage_count > 0 and damage_severity_pct > 5.0,
        "damage_severity_pct": damage_severity_pct,
        "structural_cuts_count": damage_count
    }, dilated_edges


def calculate_freshness_engine(
    color_metrics: Dict[str, Any],
    texture_metrics: Dict[str, Any],
    mold_metrics: Dict[str, Any],
    bruise_metrics: Dict[str, Any],
    damage_metrics: Dict[str, Any],
    food_category: str = "Fruits"
) -> Dict[str, Any]:
    """
    Multi-Factor Freshness Assessment Engine:
    1. Weighted Freshness Score (0 - 100)
    2. Spoilage Probability Estimation (0 - 100%)
    3. Product Quality Classification (Grade A to Grade F)
    4. 5 Freshness Categories (Fresh, Good, Acceptable, Near Spoilage, Spoiled)
    5. Freshness Trend Analysis (Cold vs Ambient decay projections)
    """
    col_deg = color_metrics["color_degradation_pct"]
    tex_deg = texture_metrics["texture_degradation_pct"]
    mold_sev = mold_metrics["mold_severity_pct"]
    bruise_sev = bruise_metrics["bruise_severity_pct"]
    dmg_sev = damage_metrics["damage_severity_pct"]

    # Category-specific weighting:
    # Meat & Seafood penalize color and mold highest; Fruits & Veg penalize bruising & shriveling
    if food_category in ["Meat & Poultry", "Seafood"]:
        w_c, w_t, w_m, w_b, w_d = 0.35, 0.15, 0.35, 0.10, 0.05
    elif food_category in ["Vegetables"]:
        w_c, w_t, w_m, w_b, w_d = 0.25, 0.30, 0.25, 0.10, 0.10
    else:  # Fruits, Bakery, etc.
        w_c, w_t, w_m, w_b, w_d = 0.25, 0.20, 0.30, 0.15, 0.10

    # Mold critical override: if mold severity > 30%, item cannot exceed Acceptable/Near Spoilage
    composite_penalty = (
        w_c * col_deg +
        w_t * tex_deg +
        w_m * mold_sev +
        w_b * bruise_sev +
        w_d * dmg_sev
    )

    raw_score = 100.0 - composite_penalty
    if mold_sev > 25.0:
        raw_score = min(raw_score, 45.0)
    if mold_sev > 50.0:
        raw_score = min(raw_score, 20.0)

    freshness_score = round(max(0.0, min(100.0, raw_score)), 1)

    # Logistic Spoilage Probability Estimation P(spoilage)
    k_decay = 0.075
    s_half = 50.0
    spoilage_prob = 100.0 / (1.0 + math.exp(k_decay * (freshness_score - s_half)))
    if mold_sev > 10.0:
        spoilage_prob = max(spoilage_prob, min(100.0, mold_sev * 2.0))
    if freshness_score < 70.0 and col_deg > 30.0:
        spoilage_prob = max(spoilage_prob, min(100.0, col_deg * 1.1))
    # For fresh tier items, clamp spoilage prob under 15%
    if freshness_score >= 85.0:
        spoilage_prob = min(spoilage_prob, 12.0)
    elif freshness_score >= 70.0:
        spoilage_prob = min(spoilage_prob, 25.0)

    spoilage_prob_pct = round(max(0.0, min(100.0, spoilage_prob)), 1)

    # 5 Exact Categories Mapping
    if freshness_score >= 85.0:
        freshness_category = CATEGORY_FRESH
        quality_grade = GRADE_A
        recommendation = "Optimal peak freshness. Excellent for prime display and extended shelf life."
    elif freshness_score >= 70.0:
        freshness_category = CATEGORY_GOOD
        quality_grade = GRADE_B
        recommendation = "Good commercial standard. Suitable for standard retail and consumption."
    elif freshness_score >= 50.0:
        freshness_category = CATEGORY_ACCEPTABLE
        quality_grade = GRADE_C
        recommendation = "Acceptable condition. Prioritize sale or immediate culinary use."
    elif freshness_score >= 30.0:
        freshness_category = CATEGORY_NEAR_SPOILAGE
        quality_grade = GRADE_D
        recommendation = "Near Spoilage warning. Expedite markdown or food-bank repurposing within 24h."
    else:
        freshness_category = CATEGORY_SPOILED
        quality_grade = GRADE_F
        recommendation = "Spoilage detected. Unfit for retail sale or consumption. Discard immediately."

    # Unified Arrhenius kinetic shelf-life calculation matching the shelf-life predictor engine
    try:
        from shelf_life_engine import predict_shelf_life, FOOD_PROFILES, DEFAULT_PACKAGING
    except ImportError:
        from backend.shelf_life_engine import predict_shelf_life, FOOD_PROFILES, DEFAULT_PACKAGING

    norm_cat = food_category if food_category in FOOD_PROFILES else "Fruits"
    profile = FOOD_PROFILES[norm_cat]

    # Calculate refrigerated shelf life under standard optimal cold storage
    cold_prediction = predict_shelf_life(
        food_category=norm_cat,
        current_temp_c=profile["optimal_temp_c"],
        current_humidity_pct=profile["optimal_humidity_pct"],
        packaging_type=DEFAULT_PACKAGING,
        storage_duration_days=0.0,
        visual_freshness_score=freshness_score,
    )
    base_shelf_life = cold_prediction["remaining_shelf_life_days"]

    # Calculate ambient shelf life under room temperature (24°C, 50% RH)
    ambient_prediction = predict_shelf_life(
        food_category=norm_cat,
        current_temp_c=24.0,
        current_humidity_pct=50.0,
        packaging_type=DEFAULT_PACKAGING,
        storage_duration_days=0.0,
        visual_freshness_score=freshness_score,
    )
    ambient_shelf_life = ambient_prediction["remaining_shelf_life_days"]

    # Freshness Trend Analysis (Projection Curve: Day 0 to Day 7)
    trend_projection = []
    for day in range(8):
        if base_shelf_life <= 0.0 or freshness_score <= 25.0:
            cold_score = 0.0 if day > 0 else round(min(25.0, freshness_score), 1)
            ambient_score = 0.0 if day > 0 else round(min(25.0, freshness_score), 1)
        else:
            cold_frac = day / max(base_shelf_life, 0.1)
            amb_frac = day / max(ambient_shelf_life, 0.1)

            cold_score = round(max(0.0, 25.0 + (freshness_score - 25.0) * ((1.0 - min(1.0, cold_frac)) ** 1.35)) if cold_frac < 1.0 else max(0.0, 20.0 * math.exp(-1.5 * (cold_frac - 1.0))), 1)
            ambient_score = round(max(0.0, 25.0 + (freshness_score - 25.0) * ((1.0 - min(1.0, amb_frac)) ** 1.35)) if amb_frac < 1.0 else max(0.0, 20.0 * math.exp(-1.5 * (amb_frac - 1.0))), 1)

        trend_projection.append({
            "day": f"Day {day}",
            "day_number": day,
            "cold_storage_score": cold_score,
            "ambient_storage_score": ambient_score
        })

    return {
        "freshness_score": freshness_score,
        "freshness_category": freshness_category,
        "quality_grade": quality_grade,
        "spoilage_probability": spoilage_prob_pct,
        "estimated_shelf_life_days": round(base_shelf_life, 1),
        "recommendation": recommendation,
        "trend_projection": trend_projection
    }


def generate_diagnostic_overlay(
    image_bgr: np.ndarray,
    mask: np.ndarray,
    mold_mask: np.ndarray,
    bruise_mask: np.ndarray,
    damage_mask: np.ndarray
) -> str:
    """
    Generate an annotated diagnostic overlay highlighting defect contours:
    - Red: Mold colonies
    - Yellow: Bruise / soft rot regions
    - Cyan: Structural cracks / cuts
    - Green border: Segmented food perimeter
    Returns base64-encoded PNG data URL.
    """
    annotated = image_bgr.copy()

    # Draw food silhouette perimeter in soft green
    food_contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(annotated, food_contours, -1, (70, 200, 70), 2)

    # Draw Bruising contours in Vibrant Yellow (BGR: 0, 220, 255)
    bruise_contours, _ = cv2.findContours(bruise_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in bruise_contours:
        if cv2.contourArea(c) > 20:
            cv2.drawContours(annotated, [c], -1, (0, 220, 255), 2)
            M = cv2.moments(c)
            if M["m00"] > 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
                cv2.putText(annotated, "BRUISE", (cx - 20, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 220, 255), 1)

    # Draw Mold contours in Bright Red (BGR: 30, 30, 240)
    mold_contours, _ = cv2.findContours(mold_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in mold_contours:
        if cv2.contourArea(c) > 15:
            cv2.drawContours(annotated, [c], -1, (30, 30, 240), 2)
            M = cv2.moments(c)
            if M["m00"] > 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
                cv2.putText(annotated, "MOLD", (cx - 15, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (30, 30, 240), 1)

    # Draw Physical damage in Bright Cyan (BGR: 255, 200, 0)
    damage_contours, _ = cv2.findContours(damage_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in damage_contours:
        if cv2.arcLength(c, True) > 20:
            cv2.drawContours(annotated, [c], -1, (255, 200, 0), 2)

    # Encode to base64 PNG
    _, buffer = cv2.imencode('.png', annotated)
    encoded = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/png;base64,{encoded}"


# =========================================================================
# DATASET BENCHMARK PRESETS (FRUITS FRESHNESS, VEGETABLE FRESHNESS, KAGGLE, FOOD-101)
# =========================================================================

DATASET_BENCHMARKS = [
    {
        "id": "fruits-fresh-apple",
        "name": "Organic Honeycrisp Apple",
        "category": "Fruits",
        "dataset_reference": "Fruits Freshness Dataset",
        "dataset_purpose": "Fruit freshness classification & pristine quality verification",
        "expected_category": CATEGORY_FRESH,
        "sample_color": "#D23B38",
        "description": "High skin turgidity, uniform carotenoid/anthocyanin pigmentation, zero mold or structural cracks."
    },
    {
        "id": "fruits-spoiled-orange",
        "name": "Valencia Orange with Mold Spores",
        "category": "Fruits",
        "dataset_reference": "Fruits Freshness Dataset",
        "dataset_purpose": "Fruit spoilage detection (Penicillium digitatum green mold)",
        "expected_category": CATEGORY_SPOILED,
        "sample_color": "#4A6E46",
        "description": "Surface pericarp degradation, prominent fungal mycelium colonies, localized softening and spore dispersal."
    },
    {
        "id": "fruits-bruised-banana",
        "name": "Cavendish Banana (Impact Bruised)",
        "category": "Fruits",
        "dataset_reference": "Fruits Freshness Dataset",
        "dataset_purpose": "Fruit shelf-life & impact bruising classification",
        "expected_category": CATEGORY_NEAR_SPOILAGE,
        "sample_color": "#C29B38",
        "description": "Sub-surface mechanical bruising, polyphenol oxidase browning, and skin softening."
    },
    {
        "id": "vegetables-fresh-spinach",
        "name": "Crisp Baby Spinach Greens",
        "category": "Vegetables",
        "dataset_reference": "Vegetable Freshness Dataset",
        "dataset_purpose": "Vegetable quality monitoring & chlorophyll retention",
        "expected_category": CATEGORY_FRESH,
        "sample_color": "#2D8A4E",
        "description": "High chlorophyll luminescence, crisp leaf parenchyma, zero wilting or yellow chlorosis."
    },
    {
        "id": "vegetables-wilted-bellpepper",
        "name": "Dehydrated Red Bell Pepper",
        "category": "Vegetables",
        "dataset_reference": "Vegetable Freshness Dataset",
        "dataset_purpose": "Shelf-life prediction & textural moisture loss",
        "expected_category": CATEGORY_ACCEPTABLE,
        "sample_color": "#B84032",
        "description": "Moderate moisture transpirational loss, surface wrinkling, high GLCM texture roughness."
    },
    {
        "id": "kaggle-fresh-salmon",
        "name": "Atlantic Salmon Steak",
        "category": "Seafood",
        "dataset_reference": "Kaggle Food Freshness Dataset",
        "dataset_purpose": "Fresh vs Spoiled classification & meat protein freshness",
        "expected_category": CATEGORY_GOOD,
        "sample_color": "#FA8072",
        "description": "Healthy astaxanthin pink pigmentation, firm muscular striations, fresh sheen."
    },
    {
        "id": "food101-sourdough-bread",
        "name": "Artisanal Sourdough Loaf",
        "category": "Bakery Products",
        "dataset_reference": "Food-101 Dataset",
        "dataset_purpose": "Food category identification & product classification support",
        "expected_category": CATEGORY_FRESH,
        "sample_color": "#C49A45",
        "description": "Caramelized Maillard crust, aerated crumb structure, no Aspergillus contamination."
    }
]


def generate_benchmark_synthetic_image(benchmark_id: str) -> np.ndarray:
    """
    Generate realistic synthetic test images matching the specified benchmark dataset sample
    if user wants to test benchmark with 1-click without uploading an external file.
    """
    img = np.ones((400, 400, 3), dtype=np.uint8) * 245  # Clean neutral studio background

    if benchmark_id == "fruits-fresh-apple":
        # Fresh red-yellow apple
        cv2.circle(img, (200, 210), 120, (30, 40, 210), -1)  # Apple body
        # Soft shine
        cv2.ellipse(img, (160, 160), (35, 15), -30, 0, 360, (90, 100, 245), -1)
        # Stem
        cv2.line(img, (200, 95), (205, 65), (20, 50, 90), 5)
    elif benchmark_id == "fruits-spoiled-orange":
        # Spoiled orange with mold spores
        cv2.circle(img, (200, 200), 125, (0, 120, 220), -1)  # Orange base
        # Dark rotting necrotic patch
        cv2.circle(img, (215, 190), 65, (15, 50, 70), -1)
        # Fungal mycelium spots (greenish white mold Penicillium digitatum)
        cv2.circle(img, (210, 185), 35, (130, 180, 140), -1)
        cv2.circle(img, (240, 175), 24, (140, 195, 155), -1)
        cv2.circle(img, (185, 210), 22, (160, 210, 170), -1)
        cv2.circle(img, (230, 220), 20, (125, 175, 135), -1)
    elif benchmark_id == "fruits-bruised-banana":
        # Bruised banana
        pts = np.array([[100, 130], [180, 260], [290, 290], [270, 260], [190, 220], [120, 110]], np.int32)
        cv2.fillPoly(img, [pts], (20, 200, 220))
        # Bruised brown zone
        cv2.circle(img, (200, 250), 30, (20, 60, 90), -1)
        cv2.circle(img, (170, 230), 20, (15, 55, 80), -1)
    elif benchmark_id == "vegetables-fresh-spinach":
        # Crisp green spinach leaf
        cv2.ellipse(img, (200, 200), (130, 85), 25, 0, 360, (40, 160, 45), -1)
        # Veins
        cv2.line(img, (100, 150), (290, 240), (70, 210, 80), 3)
    elif benchmark_id == "vegetables-wilted-bellpepper":
        # Wilted bell pepper with wrinkles
        cv2.circle(img, (200, 200), 115, (20, 40, 190), -1)
        # Darker shriveled indentations
        for offset in range(-60, 70, 30):
            cv2.ellipse(img, (200 + offset, 200), (12, 50), 10, 0, 360, (10, 25, 130), -1)
    elif benchmark_id == "kaggle-fresh-salmon":
        # Salmon fillet
        pts = np.array([[120, 150], [280, 130], [310, 250], [140, 270]], np.int32)
        cv2.fillPoly(img, [pts], (110, 130, 250))
        # White marbling stripes
        for y in range(160, 250, 20):
            cv2.line(img, (130, y), (290, y - 10), (190, 200, 255), 3)
    else:
        # Food-101 Sourdough Bread
        cv2.ellipse(img, (200, 210), (130, 85), 0, 0, 360, (50, 140, 190), -1)
        # Score marks
        cv2.line(img, (130, 180), (270, 180), (25, 80, 120), 4)
        cv2.line(img, (150, 210), (250, 210), (25, 80, 120), 4)

    return img


def run_full_image_analysis(
    image_bytes: Optional[bytes] = None,
    benchmark_id: Optional[str] = None,
    food_category_hint: Optional[str] = "Fruits",
    food_name_hint: Optional[str] = "Produce"
) -> Dict[str, Any]:
    """
    Main pipeline entrypoint: executes Computer Vision and Freshness Assessment Engine.
    Returns complete analytical dictionary ready for API and database storage.
    """
    if benchmark_id:
        b_info = next((b for b in DATASET_BENCHMARKS if b["id"] == benchmark_id), None)
        if b_info:
            food_category_hint = b_info["category"]
            food_name_hint = b_info["name"]
            dataset_ref = b_info["dataset_reference"]
        else:
            dataset_ref = "Benchmark Preset"
        image_bgr = generate_benchmark_synthetic_image(benchmark_id)
        image_filename = f"{benchmark_id}.png"
    elif image_bytes:
        image_bgr = decode_image_bytes(image_bytes)
        image_filename = "uploaded_inspection_image.jpg"
        dataset_ref = "Live Image Upload"
    else:
        raise ValueError("Either image_bytes or benchmark_id must be provided.")

    # 1. Preprocess & Segment Foreground
    resized_bgr, fg_mask = preprocess_and_segment(image_bgr)

    # 2. Color Degradation Analysis
    color_metrics = analyze_color_degradation(resized_bgr, fg_mask)

    # 3. Surface Texture Changes
    texture_metrics = analyze_surface_texture(resized_bgr, fg_mask)

    # 4. Spoilage: Mold Detection
    mold_metrics, mold_mask = detect_mold_colonies(resized_bgr, fg_mask)

    # 5. Spoilage: Bruising Detection
    bruise_metrics, bruise_mask = detect_bruising(resized_bgr, fg_mask, mold_mask)

    # 6. Spoilage: Physical Damage Detection
    damage_metrics, damage_mask = detect_physical_damage(resized_bgr, fg_mask)

    # 7. Freshness Assessment Engine Scoring
    freshness_results = calculate_freshness_engine(
        color_metrics,
        texture_metrics,
        mold_metrics,
        bruise_metrics,
        damage_metrics,
        food_category=food_category_hint or "Fruits"
    )

    # 8. Annotated Visual Defect Overlay
    diagnostic_overlay_base64 = generate_diagnostic_overlay(
        resized_bgr, fg_mask, mold_mask, bruise_mask, damage_mask
    )

    # Original Image Base64 for instant display
    _, orig_buf = cv2.imencode('.png', resized_bgr)
    orig_base64 = f"data:image/png;base64,{base64.b64encode(orig_buf).decode('utf-8')}"

    return {
        "image_filename": image_filename,
        "food_category": food_category_hint,
        "detected_food_name": food_name_hint,
        "dataset_reference": dataset_ref,
        "freshness_score": freshness_results["freshness_score"],
        "freshness_category": freshness_results["freshness_category"],
        "quality_grade": freshness_results["quality_grade"],
        "spoilage_probability": freshness_results["spoilage_probability"],
        "estimated_shelf_life_days": freshness_results["estimated_shelf_life_days"],
        "recommendation": freshness_results["recommendation"],
        "trend_projection": freshness_results["trend_projection"],
        "features": {
            "color_analysis": color_metrics,
            "texture_analysis": texture_metrics,
            "mold_detection": mold_metrics,
            "bruise_detection": bruise_metrics,
            "physical_damage_detection": damage_metrics
        },
        "visual_overlays": {
            "original_image_base64": orig_base64,
            "diagnostic_overlay_base64": diagnostic_overlay_base64
        }
    }
