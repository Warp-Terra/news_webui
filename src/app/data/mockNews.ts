import type { NewsItem } from "../types/news";

export const mockNews: NewsItem[] = [
  {
    id: "news-001",
    title: "Fed signals slower path for rate cuts as services inflation stays sticky",
    source: "Reuters",
    sourceUrl: "https://www.reuters.com/markets/us/",
    region: "US",
    category: "Economy",
    tags: ["Federal Reserve", "inflation", "interest rates", "markets"],
    publishedAt: "2026-04-23T14:30:00Z",
    summary:
      "Federal Reserve officials indicated that additional rate cuts may be delayed while services inflation remains above target and wage growth cools only gradually.",
    keyPoints: [
      "Policy makers emphasized data dependence before the next FOMC meeting.",
      "Treasury yields moved higher after the comments.",
      "Financial stocks outperformed while rate-sensitive sectors weakened.",
    ],
    impact:
      "Higher-for-longer expectations could tighten global liquidity and pressure emerging-market currencies.",
    importance: "high",
  },
  {
    id: "news-002",
    title: "中国推出新一轮算力基础设施补贴，聚焦中西部数据中心集群",
    source: "财新",
    sourceUrl: "https://www.caixin.com/tech/",
    region: "CN",
    category: "Technology",
    tags: ["AI", "算力", "数据中心", "产业政策"],
    publishedAt: "2026-04-23T08:15:00Z",
    summary:
      "多部门联合发布方案，支持绿色数据中心、国产加速芯片适配以及跨区域算力调度平台建设。",
    keyPoints: [
      "补贴重点转向能效指标和实际利用率。",
      "运营商与云厂商将参与区域算力调度试点。",
      "政策鼓励金融机构为数据中心改造提供长期贷款。",
    ],
    impact:
      "政策可能加速国产 AI 基础设施生态成熟，并提升西部新能源消纳能力。",
    importance: "high",
  },
  {
    id: "news-003",
    title: "EU reaches provisional agreement on critical minerals stockpile mechanism",
    source: "Financial Times",
    sourceUrl: "https://www.ft.com/world/europe",
    region: "EU",
    category: "Politics",
    tags: ["critical minerals", "supply chain", "EU policy", "trade"],
    publishedAt: "2026-04-22T19:45:00Z",
    summary:
      "European negotiators agreed on a framework to coordinate strategic stockpiles for lithium, cobalt, rare earths, and graphite across member states.",
    keyPoints: [
      "The mechanism prioritizes electric vehicles, defense electronics, and grid equipment.",
      "Member states will report inventory levels through a shared platform.",
      "Brussels plans joint procurement tools for emergency supply gaps.",
    ],
    impact:
      "The agreement may reduce single-source dependency but could increase competition for upstream assets.",
    importance: "medium",
  },
  {
    id: "news-004",
    title: "Japan approves record defense procurement package for maritime surveillance",
    source: "Nikkei Asia",
    sourceUrl: "https://asia.nikkei.com/Politics/Defense",
    region: "JP",
    category: "Military",
    tags: ["defense", "maritime security", "drones", "radar"],
    publishedAt: "2026-04-22T05:20:00Z",
    summary:
      "Tokyo approved additional spending for long-endurance drones, coastal radar upgrades, and unmanned surface vessels to strengthen island-chain monitoring.",
    keyPoints: [
      "Procurement prioritizes interoperable systems with allies.",
      "Domestic shipbuilders and electronics suppliers are expected to benefit.",
      "Deployment will focus on southwestern island routes.",
    ],
    impact:
      "Enhanced surveillance capabilities may shift regional deterrence dynamics in the Western Pacific.",
    importance: "high",
  },
  {
    id: "news-005",
    title: "Global LNG prices ease as European storage levels remain above seasonal average",
    source: "Bloomberg",
    sourceUrl: "https://www.bloomberg.com/energy",
    region: "Global",
    category: "Energy",
    tags: ["LNG", "natural gas", "Europe", "energy markets"],
    publishedAt: "2026-04-21T21:10:00Z",
    summary:
      "Spot LNG benchmarks declined for a third session as mild weather and strong storage buffers lowered near-term procurement urgency in Europe.",
    keyPoints: [
      "Asian buyers are delaying cargo purchases amid softer prices.",
      "European inventories remain comfortably above the five-year average.",
      "Shipping rates for LNG carriers also moved lower.",
    ],
    impact:
      "Lower gas prices could reduce industrial cost pressure while weighing on upstream cash flows.",
    importance: "medium",
  },
  {
    id: "news-006",
    title: "White House proposes AI export screening rules for frontier model weights",
    source: "The Wall Street Journal",
    sourceUrl: "https://www.wsj.com/tech/ai",
    region: "US",
    category: "Technology",
    tags: ["AI regulation", "export controls", "model weights", "national security"],
    publishedAt: "2026-04-21T16:05:00Z",
    summary:
      "The administration is drafting a licensing framework that would review overseas transfers of frontier AI model weights and high-risk training services.",
    keyPoints: [
      "Cloud providers may need to verify customer location and compute usage.",
      "Open-source developers are seeking carve-outs for smaller models.",
      "Industry groups warned that broad rules could slow research collaboration.",
    ],
    impact:
      "The rules could reshape global AI partnerships and increase compliance costs for cloud platforms.",
    importance: "critical",
  },
  {
    id: "news-007",
    title: "中国新能源汽车出口继续增长，欧洲市场份额小幅回升",
    source: "第一财经",
    sourceUrl: "https://www.yicai.com/news/",
    region: "CN",
    category: "Economy",
    tags: ["新能源汽车", "出口", "供应链", "欧洲"],
    publishedAt: "2026-04-21T02:40:00Z",
    summary:
      "海关数据显示，电动车与插混车型出口保持两位数增长，车企通过本地化服务网络抵消关税不确定性。",
    keyPoints: [
      "东南亚与欧洲仍是主要增量市场。",
      "电池成本下降提升了出口车型毛利率。",
      "部分企业加快海外组装工厂谈判。",
    ],
    impact:
      "出口韧性有助于稳定制造业订单，但也可能引发更多贸易审查。",
    importance: "medium",
  },
  {
    id: "news-008",
    title: "EU carbon price rebounds after lawmakers back tighter industrial exemptions",
    source: "Politico Europe",
    sourceUrl: "https://www.politico.eu/energy-and-climate/",
    region: "EU",
    category: "Energy",
    tags: ["carbon market", "ETS", "industry", "climate policy"],
    publishedAt: "2026-04-20T18:25:00Z",
    summary:
      "European carbon allowances rose after a parliamentary committee supported a narrower exemption schedule for energy-intensive industries.",
    keyPoints: [
      "Steel and cement producers face faster phase-down of free allowances.",
      "Utilities increased hedging activity following the vote.",
      "Final negotiations with member states are expected next month.",
    ],
    impact:
      "Higher carbon prices may accelerate efficiency investment but increase near-term industrial costs.",
    importance: "medium",
  },
  {
    id: "news-009",
    title: "Japan core inflation cools as food price pressure moderates",
    source: "NHK World",
    sourceUrl: "https://www3.nhk.or.jp/nhkworld/en/news/business/",
    region: "JP",
    category: "Economy",
    tags: ["inflation", "BOJ", "consumer prices", "yen"],
    publishedAt: "2026-04-20T00:50:00Z",
    summary:
      "Japan's core consumer inflation eased for the second month, giving the Bank of Japan more room to assess wage settlement data before tightening further.",
    keyPoints: [
      "Food and utility components contributed most to the slowdown.",
      "Service inflation remained steady in major urban areas.",
      "The yen weakened slightly after the release.",
    ],
    impact:
      "Softer inflation may delay further BOJ tightening and influence regional fixed-income flows.",
    importance: "low",
  },
  {
    id: "news-010",
    title: "G7 energy ministers announce joint funding window for grid-scale storage",
    source: "Associated Press",
    sourceUrl: "https://apnews.com/hub/energy",
    region: "Global",
    category: "Energy",
    tags: ["G7", "battery storage", "power grid", "clean energy"],
    publishedAt: "2026-04-19T17:35:00Z",
    summary:
      "G7 ministers unveiled a financing facility intended to accelerate long-duration storage projects and grid modernization in allied and developing economies.",
    keyPoints: [
      "The facility will blend public guarantees with private capital.",
      "Priority projects include storage for solar-heavy grids.",
      "Technical standards will focus on cybersecurity and resilience.",
    ],
    impact:
      "Coordinated financing could unlock battery supply-chain demand and improve renewable integration.",
    importance: "high",
  },
  {
    id: "news-011",
    title: "US Navy expands autonomous logistics trials across Indo-Pacific bases",
    source: "Defense News",
    sourceUrl: "https://www.defensenews.com/naval/",
    region: "US",
    category: "Military",
    tags: ["US Navy", "autonomous systems", "logistics", "Indo-Pacific"],
    publishedAt: "2026-04-19T12:00:00Z",
    summary:
      "The Navy is testing unmanned cargo vessels and AI-enabled routing software to improve distributed logistics under contested operating conditions.",
    keyPoints: [
      "Trials include fuel, spare parts, and medical supply delivery scenarios.",
      "Commanders are evaluating cyber resilience and fallback controls.",
      "Results will inform procurement plans for unmanned support platforms.",
    ],
    impact:
      "Successful trials could reduce vulnerability of traditional logistics hubs and reshape naval procurement.",
    importance: "medium",
  },
  {
    id: "news-012",
    title: "中欧举行经贸工作组会谈，重点讨论电动车与绿色补贴争端",
    source: "新华社",
    sourceUrl: "https://www.news.cn/fortune/",
    region: "CN",
    category: "Politics",
    tags: ["中欧关系", "贸易", "电动车", "补贴"],
    publishedAt: "2026-04-19T06:45:00Z",
    summary:
      "双方工作组就电动车调查、绿色产业补贴透明度以及市场准入问题交换意见，并同意保持技术层沟通。",
    keyPoints: [
      "双方均强调避免贸易摩擦升级。",
      "企业层面的价格承诺方案仍在讨论中。",
      "绿色供应链合作被列为后续议题。",
    ],
    impact:
      "谈判进展将影响汽车、锂电与光伏企业的欧洲市场预期。",
    importance: "high",
  },
  {
    id: "news-013",
    title: "European semiconductor consortium opens pilot line for advanced packaging",
    source: "Euronews",
    sourceUrl: "https://www.euronews.com/next/",
    region: "EU",
    category: "Technology",
    tags: ["semiconductors", "advanced packaging", "EU Chips Act", "manufacturing"],
    publishedAt: "2026-04-18T13:25:00Z",
    summary:
      "A multi-country consortium launched a pilot facility for 2.5D and 3D advanced packaging aimed at automotive, aerospace, and AI accelerator applications.",
    keyPoints: [
      "The line will provide prototyping capacity for European fabless firms.",
      "Public funding covers equipment, training, and process validation.",
      "Commercial capacity remains several years away.",
    ],
    impact:
      "The project may strengthen Europe's chip ecosystem, though scale and cost competitiveness remain uncertain.",
    importance: "medium",
  },
  {
    id: "news-014",
    title: "Japan utilities restart offshore wind tenders with stricter local supply criteria",
    source: "The Japan Times",
    sourceUrl: "https://www.japantimes.co.jp/business/",
    region: "JP",
    category: "Energy",
    tags: ["offshore wind", "utilities", "renewables", "supply chain"],
    publishedAt: "2026-04-18T03:15:00Z",
    summary:
      "Japanese utilities reopened several offshore wind tenders, requiring stronger local maintenance plans and clearer turbine procurement risk management.",
    keyPoints: [
      "Developers must detail port upgrades and local workforce training.",
      "Tender rules include penalties for construction delays.",
      "Foreign turbine makers are partnering with domestic engineering firms.",
    ],
    impact:
      "The criteria may improve project resilience but could raise bid prices and slow deployment.",
    importance: "low",
  },
  {
    id: "news-015",
    title: "UN warns Red Sea shipping disruptions are lifting insurance premiums worldwide",
    source: "UN News",
    sourceUrl: "https://news.un.org/en/",
    region: "Global",
    category: "Military",
    tags: ["Red Sea", "shipping", "insurance", "maritime security"],
    publishedAt: "2026-04-17T22:10:00Z",
    summary:
      "A UN trade assessment said persistent security risks in the Red Sea are increasing war-risk premiums and rerouting costs for container and energy shipments.",
    keyPoints: [
      "Smaller import-dependent economies face the sharpest freight increases.",
      "Energy and food cargoes are seeing longer delivery times.",
      "International naval patrol coordination remains uneven.",
    ],
    impact:
      "Shipping disruptions could add inflationary pressure and complicate humanitarian supply chains.",
    importance: "critical",
  },
  {
    id: "news-016",
    title: "US Congress advances bipartisan bill to streamline permitting for transmission lines",
    source: "The Hill",
    sourceUrl: "https://thehill.com/policy/energy-environment/",
    region: "US",
    category: "Politics",
    tags: ["Congress", "permitting", "power grid", "infrastructure"],
    publishedAt: "2026-04-17T15:55:00Z",
    summary:
      "A Senate committee advanced legislation that would set federal timelines for high-voltage transmission approvals and expand backstop siting authority.",
    keyPoints: [
      "Utilities and renewable developers support faster permitting.",
      "Some state officials raised concerns over local authority.",
      "The bill includes funding for community benefit agreements.",
    ],
    impact:
      "Faster transmission approvals could unlock renewable projects and reduce regional power price volatility.",
    importance: "medium",
  },
  {
    id: "news-017",
    title: "中国商业航天公司完成可重复使用火箭垂直回收试验",
    source: "澎湃新闻",
    sourceUrl: "https://www.thepaper.cn/",
    region: "CN",
    category: "Technology",
    tags: ["商业航天", "可重复使用火箭", "卫星互联网", "制造业"],
    publishedAt: "2026-04-17T04:30:00Z",
    summary:
      "一家民营火箭企业宣布完成公里级垂直起降回收试验，为后续轨道级回收验证奠定基础。",
    keyPoints: [
      "试验验证了发动机深度变推力和着陆控制算法。",
      "公司计划在年内进行更高高度测试。",
      "卫星互联网发射需求推动商业航天融资回暖。",
    ],
    impact:
      "回收技术突破有望降低发射成本，提升低轨星座建设速度。",
    importance: "medium",
  },
  {
    id: "news-018",
    title: "EU defense fund expands drone countermeasure grants after airport incidents",
    source: "Deutsche Welle",
    sourceUrl: "https://www.dw.com/en/europe/s-1433",
    region: "EU",
    category: "Military",
    tags: ["drones", "counter-UAS", "airports", "defense funding"],
    publishedAt: "2026-04-16T20:40:00Z",
    summary:
      "The European Defence Fund added a dedicated grant track for counter-drone detection and jamming systems following repeated disruptions near critical infrastructure.",
    keyPoints: [
      "Projects must demonstrate interoperability across member states.",
      "Airport operators will be included in field trials.",
      "Civil-liberty groups requested transparency on signal-jamming safeguards.",
    ],
    impact:
      "Funding could accelerate counter-UAS commercialization while raising regulatory questions for civilian airspace.",
    importance: "high",
  },
  {
    id: "news-019",
    title: "Japan cabinet backs digital yen pilot for interbank settlement",
    source: "Kyodo News",
    sourceUrl: "https://english.kyodonews.net/",
    region: "JP",
    category: "Technology",
    tags: ["digital yen", "CBDC", "payments", "banks"],
    publishedAt: "2026-04-16T07:05:00Z",
    summary:
      "Japan's cabinet endorsed a limited digital yen pilot focused on interbank settlement, offline payment resilience, and privacy-preserving transaction design.",
    keyPoints: [
      "Major banks will test tokenized settlement in a sandbox environment.",
      "The pilot does not commit Japan to retail CBDC issuance.",
      "Regulators will publish privacy and cybersecurity findings next year.",
    ],
    impact:
      "The pilot could influence Asia-Pacific payment standards and bank technology investment.",
    importance: "low",
  },
  {
    id: "news-020",
    title: "IMF raises global growth forecast but flags debt refinancing wall",
    source: "International Monetary Fund",
    sourceUrl: "https://www.imf.org/en/News",
    region: "Global",
    category: "Economy",
    tags: ["IMF", "global growth", "debt", "emerging markets"],
    publishedAt: "2026-04-15T23:00:00Z",
    summary:
      "The IMF slightly upgraded its global growth outlook, citing resilient consumption and investment, but warned that refinancing needs remain elevated for low-income economies.",
    keyPoints: [
      "Advanced economies are expected to grow modestly faster than previously forecast.",
      "Debt-service burdens remain a central risk for vulnerable countries.",
      "The IMF urged credible medium-term fiscal plans.",
    ],
    impact:
      "A better growth outlook may support risk assets, while sovereign debt stress remains a tail risk.",
    importance: "high",
  },
  {
    id: "news-021",
    title: "US oil inventories rise unexpectedly as refinery maintenance season extends",
    source: "Energy Information Administration",
    sourceUrl: "https://www.eia.gov/petroleum/",
    region: "US",
    category: "Energy",
    tags: ["oil", "inventories", "refineries", "WTI"],
    publishedAt: "2026-04-15T14:40:00Z",
    summary:
      "US crude inventories increased despite steady exports as refinery utilization stayed below normal during an extended maintenance cycle.",
    keyPoints: [
      "Gasoline stocks also rose in several regions.",
      "WTI prices slipped after the inventory release.",
      "Analysts expect runs to recover before peak summer demand.",
    ],
    impact:
      "Temporary inventory builds may cap oil prices unless demand rebounds or supply risks intensify.",
    importance: "low",
  },
  {
    id: "news-022",
    title: "中国发布军民融合标准更新，强化无人系统安全认证",
    source: "中国日报",
    sourceUrl: "https://www.chinadaily.com.cn/china/",
    region: "CN",
    category: "Military",
    tags: ["无人系统", "安全认证", "军民融合", "标准"],
    publishedAt: "2026-04-15T09:10:00Z",
    summary:
      "新标准覆盖无人机通信链路、供应链追溯、关键零部件可靠性测试以及网络安全审查流程。",
    keyPoints: [
      "企业需提交关键传感器与通信模块来源说明。",
      "标准明确了高风险场景下的失效保护要求。",
      "地方试点园区将先行开展认证服务。",
    ],
    impact:
      "认证要求将提高行业准入门槛，并促进高可靠零部件供应商发展。",
    importance: "medium",
  },
  {
    id: "news-023",
    title: "EU court upholds major platform transparency rules under Digital Services Act",
    source: "Le Monde",
    sourceUrl: "https://www.lemonde.fr/en/europe/",
    region: "EU",
    category: "Politics",
    tags: ["Digital Services Act", "platform regulation", "transparency", "courts"],
    publishedAt: "2026-04-14T18:00:00Z",
    summary:
      "A European court rejected a challenge to DSA transparency obligations, preserving requirements for ad libraries, risk assessments, and researcher data access.",
    keyPoints: [
      "Large platforms must continue publishing systemic risk reports.",
      "The ruling strengthens the Commission's enforcement position.",
      "Technology firms warned about trade-secret exposure.",
    ],
    impact:
      "The decision reinforces Europe's platform governance model and could shape similar laws abroad.",
    importance: "critical",
  },
  {
    id: "news-024",
    title: "Japan opposition parties call for snap election debate after funding scandal report",
    source: "Asahi Shimbun",
    sourceUrl: "https://www.asahi.com/ajw/",
    region: "JP",
    category: "Politics",
    tags: ["Japan politics", "election", "party funding", "governance"],
    publishedAt: "2026-04-14T05:30:00Z",
    summary:
      "Opposition leaders demanded a parliamentary debate on election timing after an independent report criticized party funding disclosure practices.",
    keyPoints: [
      "The ruling coalition said policy continuity remains the priority.",
      "Polling shows voters are focused on wages and living costs.",
      "Analysts expect cabinet reshuffle speculation to increase.",
    ],
    impact:
      "Political uncertainty could complicate fiscal and defense budget negotiations.",
    importance: "low",
  },
  {
    id: "news-025",
    title: "Global cyber agencies warn of coordinated attacks on satellite ground stations",
    source: "Cybersecurity and Infrastructure Security Agency",
    sourceUrl: "https://www.cisa.gov/news-events/cybersecurity-advisories",
    region: "Global",
    category: "Technology",
    tags: ["cybersecurity", "satellites", "critical infrastructure", "space"],
    publishedAt: "2026-04-13T20:20:00Z",
    summary:
      "Cybersecurity agencies from multiple countries issued a joint advisory on intrusion attempts targeting satellite ground station management systems.",
    keyPoints: [
      "Attackers are exploiting unpatched VPN appliances and weak remote access controls.",
      "The advisory recommends network segmentation and hardware-backed credentials.",
      "Telecom, weather, and defense contractors are considered high-priority targets.",
    ],
    impact:
      "Successful attacks could disrupt communications, navigation support, and defense monitoring services.",
    importance: "critical",
  },
];
