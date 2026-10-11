import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Thermometer,
  Clock,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Layers,
  HelpCircle,
  Tag,
  Sliders,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Droplets,
  Package,
  MapPin,
  Flame,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

const ROYAL = '#0047AB';
const ROYAL_D = '#003882';
const YELLOW = '#FFC700';

// ── HELPER TO RENDER FRIENDLY FORMATTED TEXT (NO RAW ASTERISKS) ─────────────
const renderFormattedText = (text = '') => {
  if (!text) return null;
  const paragraphs = text.split('\n\n');
  return paragraphs.map((para, pIdx) => {
    const parts = para.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={pIdx} className="leading-relaxed mb-2 last:mb-0">
        {parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={idx} className="font-black text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        })}
      </p>
    );
  });
};

// ── SIMPLE & FRIENDLY FOOD KNOWLEDGE BASE ───────────────────────────────────
const FOOD_KNOWLEDGE = {
  Fruits: {
    ideal_temp: 3,
    ideal_humidity: 90,
    temp_range: '1°C – 4°C',
    gas_producer: true,
    freezable: true,
    freeze_tip: 'Slice and freeze in a single layer on a tray, then store in an airtight freezer bag.',
    kitchen_ideas: ['Bake into pies, tarts, or muffins', 'Simmer into sweet fruit compote or jam', 'Blend into fresh smoothies or juice'],
    wash_advice: 'Do not wash until right before eating or cooking, as extra moisture makes fruit mold faster.',
    handling_advice: 'Handle gently and do not stack heavy boxes on top to avoid soft brown bruises.'
  },
  Vegetables: {
    ideal_temp: 4,
    ideal_humidity: 95,
    temp_range: '2°C – 5°C',
    gas_sensitive: true,
    freezable: true,
    freeze_tip: 'Boil for 1 to 2 minutes (blanch), cool in ice water, dry completely, and freeze.',
    kitchen_ideas: ['Puree into vegetable soups', 'Make homemade stir-fries or roasted sides', 'Simmer into flavorful vegetable broth'],
    wash_advice: 'Keep unwashed in the crisper drawer until ready to use so leaves stay fresh and crisp.',
    handling_advice: 'Avoid squeezing or packing tightly so leaves can breathe and stay green.'
  },
  'Dairy Products': {
    ideal_temp: 3,
    ideal_humidity: 80,
    temp_range: '2°C – 4°C',
    freezable: false,
    freeze_tip: 'Butter and hard cheese freeze well. Fresh milk, cream, and yogurt will separate and become watery if frozen.',
    kitchen_ideas: ['Make creamy pasta sauces (like alfredo or mac & cheese)', 'Bake into scones, cakes, or pancakes', 'Blend into creamy breakfast shakes'],
    wash_advice: 'Always keep tightly sealed to prevent absorbing strong food odors from the fridge.',
    handling_advice: 'Always store on fridge shelves, not in the door, because the door is warmer.'
  },
  'Meat & Poultry': {
    ideal_temp: 1,
    ideal_humidity: 85,
    temp_range: '0°C – 2°C',
    freezable: true,
    freeze_tip: 'Wrap tightly in cling film or freezer paper, or freeze in vacuum-sealed packs for up to 6 months.',
    kitchen_ideas: ['Slow-cook into hearty stews or curries', 'Marinate and grill for meal prep', 'Simmer bones and scraps into rich broth'],
    wash_advice: 'Never wash raw meat in the sink — it spreads bacteria. Cook thoroughly to safe temperatures instead.',
    handling_advice: 'Always keep on the bottom shelf in a sealed tray so raw juices cannot drip onto other food.'
  },
  Seafood: {
    ideal_temp: 1,
    ideal_humidity: 95,
    temp_range: '0°C – 2°C',
    freezable: true,
    freeze_tip: 'Freeze immediately if not cooking within 24 hours. Wrap tightly to protect from freezer burn.',
    kitchen_ideas: ['Cook into seafood chowders or fish pies', 'Make crispy pan-fried fish cakes', 'Simmer into quick fish tacos or pasta'],
    wash_advice: 'Rinse quickly with cold water and pat completely dry with paper towels before cooking.',
    handling_advice: 'Keep packed over crushed ice or in the coldest zone of your refrigerator.'
  },
  'Bakery Products': {
    ideal_temp: 20,
    ideal_humidity: 55,
    temp_range: '18°C – 22°C (Room Temp)',
    freezable: true,
    freeze_tip: 'Slice first and freeze in sealed bags! You can pop frozen slices straight into the toaster.',
    kitchen_ideas: ['Toss with olive oil and herbs for crunchy croutons', 'Bake into warm bread pudding', 'Pulse into crispy homemade breadcrumbs'],
    wash_advice: 'Keep away from damp areas. Never store bread in the fridge because it goes stale faster!',
    handling_advice: 'Store in a cool, dry bread box or sealed paper bag away from direct sunlight.'
  },
  'Packaged Foods': {
    ideal_temp: 18,
    ideal_humidity: 50,
    temp_range: '15°C – 20°C (Pantry)',
    freezable: false,
    freeze_tip: 'Freezing is not needed for shelf-stable pantry goods.',
    kitchen_ideas: ['Use in everyday pantry meals', 'Batch-prep sauces or grains for the week'],
    wash_advice: 'Keep in airtight jars or containers once opened to keep out pantry pests and moisture.',
    handling_advice: 'Keep stored off the floor in a dark, dry cabinet away from stoves and heat.'
  },
  Beverages: {
    ideal_temp: 4,
    ideal_humidity: 70,
    temp_range: '2°C – 5°C',
    freezable: false,
    freeze_tip: 'Do not freeze glass bottles or fizzy drinks — liquid expands when freezing and can burst the container!',
    kitchen_ideas: ['Use fruit juices in glazes, marinades, or salad dressings', 'Freeze juice in ice cube trays for chilled drinks'],
    wash_advice: 'Keep caps firmly closed and refrigerate after opening.',
    handling_advice: 'Store upright on refrigerator shelves to avoid leaks.'
  }
};

export const ItemRecommendationChatbot = ({ selectedItem, daysLeft }) => {
  // Surroundings State
  const [surroundings, setSurroundings] = useState({
    temp: selectedItem?.current_temperature ?? 4.0,
    humidity: selectedItem?.current_humidity ?? 85,
    location: selectedItem?.storage_location || 'Cold Storage',
    packaging: selectedItem?.packaging_type || 'Cardboard Box',
    nearby: 'None / Isolated'
  });

  const [showControls, setShowControls] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const category = selectedItem?.category || 'Fruits';
  const profile = FOOD_KNOWLEDGE[category] || FOOD_KNOWLEDGE['Fruits'];
  const itemName = selectedItem?.name || 'this food item';

  // Format initial friendly greeting when a new item is selected
  useEffect(() => {
    if (!selectedItem) return;

    const initialTemp = selectedItem.current_temperature ?? 4.0;
    const initialHum = selectedItem.current_humidity ?? 85;
    const initialLoc = selectedItem.storage_location || 'Cold Storage';
    const initialPkg = selectedItem.packaging_type || 'Cardboard Box';

    setSurroundings({
      temp: initialTemp,
      humidity: initialHum,
      location: initialLoc,
      packaging: initialPkg,
      nearby: selectedItem.category === 'Fruits' ? 'Leafy Greens' : 'None / Isolated'
    });

    const safeDays = daysLeft !== null ? daysLeft : 5;
    const statusNote = safeDays <= 2
      ? `• Status: ${safeDays}d remaining (Action required)`
      : `• Status: ${safeDays}d remaining in ${initialLoc} (${initialTemp}°C)`;

    setMessages([
      {
        id: 'welcome-' + Date.now(),
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `**${selectedItem.name}** (Batch #${selectedItem.batch_number})\n${statusNote}\n\nSelect a topic below for recommendations:`,
        showTopicButtons: true,
        contextTag: `${initialLoc} · ${initialTemp}°C`
      }
    ]);
  }, [selectedItem?.id, daysLeft]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Generate friendly, professional, clear advice on a specific requested topic
  const answerTopic = (topicKey, userQueryText) => {
    if (!selectedItem) return;

    const currentTemp = surroundings.temp;
    const currentHumidity = surroundings.humidity;
    const location = surroundings.location;
    const packaging = surroundings.packaging;
    const nearby = surroundings.nearby;
    const safeDays = daysLeft !== null ? daysLeft : 5;

    // Temperature checks
    const tempDiff = currentTemp - profile.ideal_temp;
    const isTooWarm = tempDiff > 3;
    const isTooCold = tempDiff < -2;

    let responseObj = null;

    if (topicKey === 'storage') {
      const tempLine = isTooWarm
        ? `• **Temperature (${currentTemp}°C):** Exceeds recommended threshold (${profile.temp_range}). Relocate to cooler storage to prevent accelerated softening.`
        : isTooCold
        ? `• **Temperature (${currentTemp}°C):** Near freezing point. Target ${profile.temp_range} to avoid chill injury.`
        : `• **Temperature (${currentTemp}°C):** Optimal range maintained (${profile.temp_range}).`;

      const humLine = currentHumidity < profile.ideal_humidity - 15
        ? `• **Humidity (${currentHumidity}% RH):** Low moisture. Keep packaging closed to prevent product dehydration.`
        : `• **Humidity (${currentHumidity}% RH):** Standard moisture level maintained.`;

      responseObj = {
        title: `Storage Guidance · ${itemName}`,
        Icon: Thermometer,
        badge: isTooWarm ? 'Cooler Spot Required' : 'Optimal',
        badgeColor: isTooWarm ? '#dc2626' : '#16a34a',
        content: `${tempLine}\n\n${humLine}\n\n• **Location:** Store in ${location} away from floor contact.`
      };

    } else if (topicKey === 'consumption') {
      const timeLine = safeDays <= 2
        ? `• **Urgency:** ${safeDays} day(s) remaining. Prioritize for dispatch or kitchen processing within 24 hours.`
        : safeDays <= 5
        ? `• **Quality Window:** Prime consumption window (${safeDays} days remaining). Optimal flavor and texture.`
        : `• **Status:** Stable inventory (${safeDays} days remaining).`;

      responseObj = {
        title: `Usage Timeline · ${itemName}`,
        Icon: Clock,
        badge: safeDays <= 2 ? 'Action Required' : `${safeDays}d Remaining`,
        badgeColor: safeDays <= 2 ? '#dc2626' : '#0047AB',
        content: `${timeLine}\n\n• **Kitchen Utilization:** ${profile.kitchen_ideas[0]}.`
      };

    } else if (topicKey === 'rotation') {
      const rotLine = safeDays <= 2
        ? `• **Priority Placement:** Move Batch #${selectedItem.batch_number} to front row for immediate dispatch (FEFO).`
        : `• **Sequence:** Sequence ahead of newer receipts with later expiration dates (FEFO rule).`;

      responseObj = {
        title: `Inventory Rotation · ${itemName}`,
        Icon: RotateCcw,
        badge: safeDays <= 2 ? 'Front Row' : 'FEFO Standard',
        badgeColor: safeDays <= 2 ? '#dc2626' : '#7c3aed',
        content: `${rotLine}\n\n• **Protocol:** Label crate with priority rotation marker.`
      };

    } else if (topicKey === 'waste') {
      const discountLine = safeDays <= 2
        ? `• **Pricing Action:** Apply 20% to 40% clearance markdown to ensure complete inventory sell-through.`
        : safeDays <= 5
        ? `• **Pricing Action:** Standard price, or 10% bundle promotion if inventory turnover is slow.`
        : `• **Pricing Action:** Maintain standard retail price (0% markdown).`;

      responseObj = {
        title: `Waste Reduction · ${itemName}`,
        Icon: ShieldCheck,
        badge: safeDays <= 2 ? '20%–40% Markdown' : 'Zero Loss Risk',
        badgeColor: safeDays <= 2 ? '#ea580c' : '#16a34a',
        content: `${discountLine}\n\n• **Salvage Option:** Repurpose soft units into ${profile.kitchen_ideas[1] || profile.kitchen_ideas[0]}.`
      };

    } else if (topicKey === 'quality') {
      let neighborLine = '• **Proximity:** Stored safely with no companion conflicts.';
      if (profile.gas_producer && nearby.includes('Leafy Greens')) {
        neighborLine = '• **Proximity Alert:** Isolate from leafy greens (ethylene exposure causes premature leaf yellowing).';
      } else if (profile.gas_sensitive && (nearby.includes('Bananas') || nearby.includes('Apples'))) {
        neighborLine = '• **Proximity Alert:** Isolate from high-ethylene producers (bananas/apples accelerate senescence).';
      }

      responseObj = {
        title: `Quality Standards · ${itemName}`,
        Icon: CheckCircle2,
        badge: 'Quality Care',
        badgeColor: '#0047AB',
        content: `• **Handling:** ${profile.handling_advice}\n\n• **Washing:** ${profile.wash_advice}\n\n${neighborLine}`
      };

    } else if (topicKey === 'all') {
      responseObj = {
        title: `Overview Summary · ${itemName}`,
        Icon: Layers,
        badge: 'Complete Plan',
        badgeColor: '#0047AB',
        isFullSummary: true,
        summaryParts: [
          { title: 'Storage', text: `Maintain ${profile.temp_range} (Current: ${currentTemp}°C in ${location}).` },
          { title: 'Usage', text: `${safeDays}d remaining. ${safeDays <= 2 ? 'Prioritize immediate dispatch.' : 'Stable window.'}` },
          { title: 'Rotation', text: `Batch #${selectedItem.batch_number} front row sequence (FEFO).` },
          { title: 'Waste Reduction', text: `${safeDays <= 2 ? '20%-40% clearance discount.' : 'Standard retail price.'}` },
          { title: 'Quality Care', text: `${profile.handling_advice}` },
        ]
      };
    }

    return responseObj;
  };

  // Handle clicking a topic button or sending custom query
  const handleTopicClick = (topicKey, label) => {
    const userMsg = {
      id: 'user-' + Date.now(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: label || topicKey
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const card = answerTopic(topicKey);
      const botMsg = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is the ${topicKey === 'all' ? 'complete overview' : topicKey} analysis for **${itemName}**:`,
        card,
        showTopicButtons: true,
        contextTag: `${surroundings.location} · ${surroundings.temp}°C`
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 350);
  };

  // Handle custom free-form input
  const handleCustomQuestion = (customText) => {
    const query = (customText || inputValue).trim();
    if (!query || !selectedItem) return;

    const userMsg = {
      id: 'user-' + Date.now(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    const qLower = query.toLowerCase();

    setTimeout(() => {
      let replyTitle = `Guidance · ${itemName}`;
      let replyContent = '';
      let replyBadge = 'Operational Advice';
      let replyIcon = HelpCircle;

      if (qLower.includes('freeze') || qLower.includes('freezer')) {
        replyIcon = Thermometer;
        replyTitle = `Freezing Feasibility · ${itemName}`;
        if (profile.freezable) {
          replyBadge = 'Freezable';
          replyContent = `• Freezing is supported for ${itemName}.\n• Protocol: ${profile.freeze_tip}\n• Storage at -18°C maintains quality for 3 to 6 months.`;
        } else {
          replyBadge = 'Not Supported';
          replyContent = `• Freezing is not recommended for ${itemName}.\n• Low temperature freezing disrupts cellular integrity in ${category.toLowerCase()}, resulting in separation or moisture collapse upon thawing.`;
        }
      } else if (qLower.includes('cook') || qLower.includes('recipe') || qLower.includes('kitchen') || qLower.includes('eat')) {
        replyIcon = Clock;
        replyTitle = `Kitchen Processing Options · ${itemName}`;
        replyBadge = 'Kitchen Batching';
        const ideas = profile.kitchen_ideas.map(i => `• ${i}`).join('\n');
        replyContent = `Recommended culinary utilization options:\n\n${ideas}`;
      } else if (qLower.includes('temp') || qLower.includes('warm') || qLower.includes('heat') || qLower.includes('cold') || qLower.includes('fridge')) {
        replyIcon = Thermometer;
        replyTitle = `Thermal Thresholds · ${itemName}`;
        replyBadge = `${surroundings.temp}°C Context`;
        const tempDiff = surroundings.temp - profile.ideal_temp;
        if (tempDiff > 3) {
          replyContent = `• Current ambient reading (${surroundings.temp}°C) exceeds target baseline (${profile.temp_range}).\n• Respiration and decay rates are doubled. Relocate stock to controlled chilling.`;
        } else {
          replyContent = `• Current temperature (${surroundings.temp}°C) is compliant with standard preservation thresholds (${profile.temp_range}).`;
        }
      } else if (qLower.includes('discount') || qLower.includes('price') || qLower.includes('sell') || qLower.includes('cost')) {
        replyIcon = Tag;
        replyTitle = `Pricing Strategy · ${itemName}`;
        const safeDays = daysLeft !== null ? daysLeft : 5;
        if (safeDays <= 2) {
          replyBadge = 'Markdown 20% – 40%';
          replyContent = `• Shelf-life expiration imminent (${safeDays}d remaining).\n• Recommend 20% to 40% clearance discount to salvage wholesale asset value.`;
        } else {
          replyBadge = 'Standard Price';
          replyContent = `• Inventory condition stable (${safeDays}d remaining).\n• Maintain standard retail pricing without promotional markdowns.`;
        }
      } else if (qLower.includes('neighbor') || qLower.includes('near') || qLower.includes('banana') || qLower.includes('greens') || qLower.includes('apple')) {
        replyIcon = CheckCircle2;
        replyTitle = `Proximity Analysis · ${itemName}`;
        replyBadge = 'Proximity Check';
        if (profile.gas_producer && surroundings.nearby.includes('Leafy Greens')) {
          replyContent = `• Warning: ${itemName} releases ethylene gas. Proximity to leafy greens will cause rapid chlorophyll degradation and wilting.\n• Maintain physical separation or isolate in dedicated chambers.`;
        } else {
          replyContent = `• Stored near ${surroundings.nearby}. Maintain minimum spacing between pallets for standard ventilation.`;
        }
      } else {
        replyTitle = `Operational Summary · ${itemName}`;
        replyContent = `• Recommended Range: ${profile.temp_range} (Current: ${surroundings.temp}°C)\n• Shelf-Life: ${daysLeft !== null ? daysLeft : 5} days remaining\n• Action: ${daysLeft !== null && daysLeft <= 2 ? 'Prioritize immediate dispatch or culinary use.' : 'Standard inventory holding.'}`;
      }

      const botMsg = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Analysis query resolved:`,
        card: {
          title: replyTitle,
          Icon: replyIcon,
          badge: replyBadge,
          badgeColor: '#0047AB',
          content: replyContent
        },
        showTopicButtons: true,
        contextTag: `${surroundings.location}`
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 400);
  };

  // Re-evaluate when surroundings are altered by the user
  const handleRecalculateSurroundings = () => {
    const userMsg = {
      id: 'user-' + Date.now(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Updated parameters: ${surroundings.temp}°C, ${surroundings.humidity}% RH in ${surroundings.location}, adjacent to ${surroundings.nearby}.`
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const tempDiff = surroundings.temp - profile.ideal_temp;
      let summaryText = '';
      if (tempDiff > 4) {
        summaryText = `Note: Storage temperature set to **${surroundings.temp}°C**. Above standard threshold for ${itemName}. Shelf-life reduced by ~50%. Relocate to cold chain or schedule 20% discount.`;
      } else if (tempDiff < -2) {
        summaryText = `Note: Storage temperature set to **${surroundings.temp}°C**. Proximity to freezing point may trigger chill injury in ${itemName}.`;
      } else {
        summaryText = `Parameters updated: **${surroundings.temp}°C** and **${surroundings.humidity}% RH** in **${surroundings.location}**. Compliant with baseline preservation standards.`;
      }

      const botMsg = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `${summaryText}\n\nSelect a topic below for revised parameters:`,
        showTopicButtons: true,
        contextTag: `${surroundings.location} · ${surroundings.temp}°C · ${surroundings.humidity}% RH`
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 400);
  };

  const topicButtons = [
    { key: 'storage', label: 'Storage', Icon: Thermometer, color: '#0369a1' },
    { key: 'consumption', label: 'When to Use', Icon: Clock, color: '#0047AB' },
    { key: 'rotation', label: 'Shelf Rotation', Icon: RotateCcw, color: '#6d28d9' },
    { key: 'waste', label: 'Reduce Wastage', Icon: ShieldCheck, color: '#15803d' },
    { key: 'quality', label: 'Quality Care', Icon: CheckCircle2, color: '#b45309' },
    { key: 'all', label: 'Full Overview', Icon: Layers, color: '#334155' }
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-lg transition-all duration-300"
      style={{
        background: '#ffffff',
        border: `1.5px solid rgba(0,71,171,0.18)`,
        boxShadow: `0 12px 36px -6px rgba(0,71,171,0.08), 0 4px 18px -2px rgba(255,199,0,0.12)`,
      }}
    >
      {/* ── TOP ACCENT STRIPE ── */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0047AB] via-[#FFC700] to-[#0047AB]" />

      {/* ── CHATBOT HEADER ── */}
      <div
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100"
        style={{
          background: `linear-gradient(135deg, #f8faff 0%, #ffffff 100%)`,
        }}
      >
        {/* Left: Bot Identity + Item Target */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shrink-0 text-white"
              style={{ background: `linear-gradient(135deg, ${ROYAL}, ${ROYAL_D})` }}
            >
              <Bot className="w-6 h-6" />
            </div>
            {/* Pulsing online indicator */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                AI Assistant
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Helping with: <strong className="text-slate-800">{selectedItem?.name}</strong></span>
              <span>·</span>
              <span className="text-slate-400">Batch #{selectedItem?.batch_number}</span>
              <span>·</span>
              <span
                className="font-bold px-1.5 py-0.2 rounded text-[11px]"
                style={{
                  background: (daysLeft ?? 5) <= 2 ? '#fee2e2' : '#dcfce7',
                  color: (daysLeft ?? 5) <= 2 ? '#991b1b' : '#166534'
                }}
              >
                {daysLeft !== null ? `${daysLeft}d left` : 'Active'}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Surroundings Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setShowControls(prev => !prev)}
            className="px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xs border"
            style={{
              background: showControls ? '#eff6ff' : '#ffffff',
              color: showControls ? ROYAL : '#475569',
              borderColor: showControls ? ROYAL : '#cbd5e1'
            }}
          >
            <Sliders className="w-3.5 h-3.5 text-[#FFC700]" />
            <span>Test Surroundings (Temp, Air, Location)</span>
            {showControls ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── EXPANDABLE SURROUNDINGS & INPUTS CONTROL DRAWER ── */}
      {showControls && (
        <div
          className="p-4 sm:p-5 border-b border-blue-100 transition-all duration-300"
          style={{ background: '#f8fafc' }}
        >
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800">Simulate Item Surroundings</span>
              <span className="text-[11px] text-slate-500 font-medium">
                (Change temp or humidity to see how advice updates)
              </span>
            </div>
            <button
              onClick={handleRecalculateSurroundings}
              className="px-3 py-1.5 rounded-lg text-xs font-black text-white bg-[#0047AB] hover:bg-[#003882] transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#FFC700]" />
              <span>Update Advice</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
            {/* Temp Control */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-rose-500" /> Temperature
                </span>
                <span
                  className="font-black px-1.5 py-0.5 rounded text-[11px]"
                  style={{
                    background: surroundings.temp > 10 ? '#fee2e2' : surroundings.temp < 1 ? '#e0f2fe' : '#dcfce7',
                    color: surroundings.temp > 10 ? '#dc2626' : surroundings.temp < 1 ? '#0369a1' : '#15803d'
                  }}
                >
                  {surroundings.temp}°C
                </span>
              </div>
              <input
                type="range"
                min="-2"
                max="28"
                step="1"
                value={surroundings.temp}
                onChange={e => setSurroundings(s => ({ ...s, temp: parseFloat(e.target.value) }))}
                className="w-full accent-[#0047AB] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>Freezer (-2°)</span>
                <span>Fridge (3°)</span>
                <span>Room (22°)</span>
              </div>
            </div>

            {/* Humidity Control */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-sky-500" /> Humidity
                </span>
                <span className="font-black text-[#0047AB] px-1.5 py-0.5 rounded bg-blue-50 text-[11px]">
                  {surroundings.humidity}% RH
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="98"
                step="2"
                value={surroundings.humidity}
                onChange={e => setSurroundings(s => ({ ...s, humidity: parseInt(e.target.value) }))}
                className="w-full accent-[#0047AB] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>Dry (40%)</span>
                <span>Good (85%)</span>
                <span>Wet (98%)</span>
              </div>
            </div>

            {/* Location Selector */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <label className="text-slate-700 font-bold flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" /> Location
              </label>
              <select
                value={surroundings.location}
                onChange={e => setSurroundings(s => ({ ...s, location: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-[#0047AB]"
              >
                <option value="Cold Storage">Cold Storage Room</option>
                <option value="Walk-in Chiller">Walk-in Chiller</option>
                <option value="Ambient Pantry">Ambient Pantry / Shelf</option>
                <option value="Retail Front Shelf">Retail Display Shelf</option>
                <option value="Loading Transit Dock">Loading Dock</option>
              </select>
            </div>

            {/* Packaging Selector */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <label className="text-slate-700 font-bold flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-600" /> Packaging
              </label>
              <select
                value={surroundings.packaging}
                onChange={e => setSurroundings(s => ({ ...s, packaging: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-[#0047AB]"
              >
                <option value="Cardboard Box">Cardboard Box</option>
                <option value="Open Crate / Unwrapped">Open Crate / Unwrapped</option>
                <option value="Perforated Polybag">Perforated Plastic Bag</option>
                <option value="Sealed Plastic Container">Sealed Plastic Box</option>
                <option value="Vacuum Sealed Pack">Vacuum Sealed Pack</option>
              </select>
            </div>

            {/* Nearby Neighbor Items */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <label className="text-slate-700 font-bold flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" /> Placed Next To
              </label>
              <select
                value={surroundings.nearby}
                onChange={e => setSurroundings(s => ({ ...s, nearby: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-[#0047AB]"
              >
                <option value="None / Isolated">None (Own Shelving)</option>
                <option value="Leafy Greens">Leafy Greens (Lettuce/Spinach)</option>
                <option value="Bananas & Apples">Bananas or Apples (Ripening Gas)</option>
                <option value="Onions & Garlic">Onions or Garlic (Strong Smell)</option>
                <option value="Raw Meats">Raw Meat (Cross-Contact Risk)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── CONVERSATION CONTAINER ── */}
      <div className="p-4 sm:p-6 space-y-4 max-h-[560px] overflow-y-auto bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Chat Bubble Header — only time */}
            <div className="mb-1 px-1 text-[11px] font-bold text-slate-400">
              <span>{msg.timestamp}</span>
            </div>

            {/* Bubble Body */}
            {msg.sender === 'user' ? (
              <div
                className="max-w-xl rounded-2xl rounded-tr-xs px-4 py-2.5 text-sm font-semibold shadow-xs"
                style={{
                  background: `linear-gradient(135deg, ${ROYAL}, ${ROYAL_D})`,
                  color: '#ffffff'
                }}
              >
                {msg.text}
              </div>
            ) : (
              <div className="max-w-2xl w-full space-y-3">
                {/* Intro message bubble */}
                <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-4 shadow-xs text-sm text-slate-700 leading-relaxed">
                  {renderFormattedText(msg.text)}
                </div>

                {/* Single Professional Card (if a topic was answered) */}
                {msg.card && !msg.card.isFullSummary && (
                  <div
                    className="p-4 rounded-2xl border shadow-xs bg-white space-y-2.5"
                    style={{ borderLeft: `4px solid ${ROYAL}`, borderColor: 'rgba(0,71,171,0.18)' }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        {msg.card.Icon && <msg.card.Icon className="w-4 h-4 text-[#0047AB]" />}
                        <span>{msg.card.title}</span>
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                        style={{
                          background: `${msg.card.badgeColor}15`,
                          color: msg.card.badgeColor,
                          border: `1px solid ${msg.card.badgeColor}30`
                        }}
                      >
                        {msg.card.badge}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 font-normal leading-relaxed">
                      {renderFormattedText(msg.card.content)}
                    </div>
                  </div>
                )}

                {/* Full Summary Card (if user specifically requested Full Overview) */}
                {msg.card?.isFullSummary && (
                  <div className="p-4 rounded-2xl border shadow-xs bg-white space-y-3" style={{ borderLeft: `4px solid ${ROYAL}`, borderColor: 'rgba(0,71,171,0.18)' }}>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#0047AB]" />
                        <span>Complete AI Care Plan · {itemName}</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#0047AB] border border-blue-200">
                        All 5 Pillars
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {msg.card.summaryParts.map((part, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0047AB]" />
                            <span>{part.title}</span>
                          </span>
                          <p className="text-[11px] text-slate-600 leading-snug">
                            {part.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* In-chat Topic Buttons (Click to ask only for that topic) */}
                {msg.showTopicButtons && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold text-slate-400 mb-1.5 pl-1">
                      Choose what you want to see:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {topicButtons.map((btn) => (
                        <button
                          key={btn.key}
                          onClick={() => handleTopicClick(btn.key, btn.label)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#0047AB] bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 transition shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                        >
                          {btn.Icon && <btn.Icon className="w-3.5 h-3.5" style={{ color: btn.color }} />}
                          <span>{btn.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 p-2">
            <Bot className="w-4 h-4 text-[#0047AB] animate-pulse" />
            <span>Analyzing recommendations…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── QUICK POPULAR QUESTIONS ── */}
      <div className="p-2.5 bg-white border-t border-slate-100 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-wider pl-1 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> Suggested Queries:
        </span>
        {[
          'Can I freeze this?',
          'What happens if it gets warm?',
          'How should I price this to sell today?',
          'What recipes or meals can I cook with this?',
          'Is it safe to store near bananas or greens?'
        ].map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleCustomQuestion(q)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:text-[#0047AB] bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition shrink-0 cursor-pointer active:scale-95"
          >
            {q}
          </button>
        ))}
      </div>

      {/* ── CHAT INPUT BAR ── */}
      <div className="p-3.5 bg-white border-t border-slate-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCustomQuestion();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Ask anything about ${selectedItem?.name || 'this item'} (e.g. storage, recipes, freezing, discounts)…`}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#0047AB] focus:bg-white transition"
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => setInputValue('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0047AB] to-[#003882] hover:from-[#003882] hover:to-[#002860] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#0047AB]/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <span>Ask AI</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
