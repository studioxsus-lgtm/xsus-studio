// Marks share a square artboard with the wordmark below y=365.
// Each contour is a separate editable path in the existing editor format.
const families = [
  ['botanical', /(?<![\p{L}\p{N}])(?:leaf|leaves|botanical|botanique|feuille|gjethe|gjethja|botanik\w*)(?![\p{L}\p{N}])/iu],
  ['mountain', /(?<![\p{L}\p{N}])(?:mountains?|alpine?|summit|montagnes?|sommet|mal|mali|male|malet|malor\w*)(?![\p{L}\p{N}])/iu],
  ['coffee', /(?<![\p{L}\p{N}])(?:coffee|espresso|café|cafe|kafe|kafeje|kafene|kafeneje)(?![\p{L}\p{N}])/iu]
];

export function requestedTheme(prompt, name) {
  // The brand may itself be "Mountain" even if the requested mark is a leaf.
  const description = prompt.split(name).join(' ');
  return families.find(([,pattern]) => pattern.test(description))?.[0];
}

const M=(x,y)=>['M',x,y], L=(x,y)=>['L',x,y], Q=(x,y,u,v)=>['Q',x,y,u,v], Z=['Z'];
const path=(...commands)=>({type:'path',commands});
const circle=(cx,cy,r)=>({type:'circle',cx,cy,r});
const leafLeft=()=>path(M(247,322),Q(111,310,116,151),Q(244,162,247,322),Z);
const leafRight=()=>path(M(261,276),Q(259,135,395,106),Q(383,250,261,276),Z);
const familiesOfMarks = {
  botanical: [
    ['split-leaf',path(M(134,320),Q(78,112,373,84),Q(316,189,134,320),Z),path(M(147,331),Q(274,226,377,104),Q(376,318,147,331),Z)],
    ['seedling',leafLeft(),leafRight(),path(M(236,341),Q(254,225,310,172),Q(268,245,254,341),Z)],
    ['lotus',path(M(256,279),Q(184,208,256,90),Q(328,208,256,279),Z),leafLeft(),path(M(265,322),Q(268,162,396,151),Q(401,310,265,322),Z)]
  ],
  mountain: [
    ['ridgeline',path(M(75,323),L(193,141),L(220,182),L(128,323),Z),path(M(153,323),L(290,102),L(437,323),L(381,323),L(290,181),L(202,323),Z)],
    ['snowcap',path(M(85,325),L(256,76),L(427,325),Z,M(256,149),L(209,220),L(241,207),L(264,231),L(278,206),L(305,220),Z)],
    ['summit-sun',circle(340,149,40),path(M(78,323),L(212,126),L(296,250),L(320,217),L(432,323),L(355,323),L(320,281),L(295,315),L(212,198),L(127,323),Z)]
  ],
  coffee: [
    ['split-bean',path(M(162,304),Q(89,225,207,124),Q(291,55,349,115),Q(255,132,234,222),Q(215,286,162,304),Z),path(M(177,316),Q(238,295,256,227),Q(279,143,358,130),Q(407,216,299,300),Q(224,357,177,316),Z)],
    ['espresso-cup',path(M(134,197),L(330,197),Q(325,322,230,322),Q(147,322,134,197),Z),path(M(323,207),Q(414,185,389,251),Q(374,283,315,277),L(321,256),Q(375,256,370,231),Q(366,220,323,229),Z),path(M(201,176),Q(162,148,203,114),Q(225,97,210,79),Q(257,104,218,139),Q(195,155,201,176),Z)],
    ['pour-over',path(M(105,125),L(407,125),L(285,258),L(227,258),Z,M(170,150),L(243,229),L(266,229),L(342,150),Z),path(M(256,270),Q(298,322,256,332),Q(215,322,256,270),Z)]
  ]
};

export function themedVariants(theme,primary,accent=primary) {
  return familiesOfMarks[theme].map(([symbol,...shapes])=>({
    symbol,document:{version:'1.0.0',width:512,height:512,layers:shapes.map((shape,i)=>({...shape,fill:shapes.length>1 && i===shapes.length-1?accent:primary}))}
  }));
}
