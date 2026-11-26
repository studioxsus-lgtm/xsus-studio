// Marks share a square artboard with the wordmark below y=365.
// Each contour is a separate editable path in the existing editor format.
const families = [
  ['music', /(?<![\p{L}\p{N}])(?:music(?:al)?|musique|muzik[ëe](?:s|n)?|muzikor[ei]?|audio|melody|mélodie|melodi)(?![\p{L}\p{N}])/iu],
  ['marine', /(?<![\p{L}\p{N}])(?:ocean(?:ic)?|océan|det(?:i|it|ar[ei]?)?|maritime|marine|nautical|nautique|val[ëe](?:t|ve)?|waves?)(?![\p{L}\p{N}])/iu],
  ['architecture', /(?<![\p{L}\p{N}])(?:architecture|architectural|architects?|architectes?|arkitektur[ëe](?:s|n)?|arkitekt(?:i|it|ët)?|nd[ëe]rtim(?:i|it|eve)?)(?![\p{L}\p{N}])/iu],
  ['botanical', /(?<![\p{L}\p{N}])(?:leaf|leaves|botanical|botanique|feuille|gjethe|gjethja|botanik\w*)(?![\p{L}\p{N}])/iu],
  ['mountain', /(?<![\p{L}\p{N}])(?:mountains?|alpine?|summit|montagnes?|sommet|mal|mali|male|malet|malor\w*)(?![\p{L}\p{N}])/iu],
  ['coffee', /(?<![\p{L}\p{N}])(?:coffee|espresso|caf[ée]s?|kafe(?:ja|je|n[ëe]|s[ëe])?|kafene(?:ja|je|n[ëe]|s[ëe])?)(?![\p{L}\p{N}])/iu]
];

export function requestedTheme(prompt, name) {
  // The brand may itself be "Mountain" even if the requested mark is a leaf.
  const description = prompt.split(name).join(' ').normalize('NFC');
  return families.find(([,pattern]) => pattern.test(description))?.[0];
}

const M=(x,y)=>['M',x,y], L=(x,y)=>['L',x,y], Q=(x,y,u,v)=>['Q',x,y,u,v], Z=['Z'];
const path=(...commands)=>({type:'path',commands});
const circle=(cx,cy,r)=>({type:'circle',cx,cy,r});
const leafLeft=()=>path(M(247,322),Q(111,310,116,151),Q(244,162,247,322),Z);
const leafRight=()=>path(M(261,276),Q(259,135,395,106),Q(383,250,261,276),Z);
const bar=(x,top,width,bottom)=>path(M(x,top),L(x+width,top),L(x+width,bottom),L(x,bottom),Z);
const wave=(x,y)=>path(M(x,y),Q(x+62,y-59,x+136,y-9),Q(x+198,y+33,x+266,y-17),Q(x+211,y+72,x+126,y+25),Q(x+65,y-14,x,y+28),Z);
const familiesOfMarks = {
  music: [
    ['beam-notes',circle(175,294,34),circle(301,263,34),bar(193,137,16,294),bar(319,103,16,263),path(M(193,137),L(335,99),L(335,139),L(193,177),Z)],
    ['sound-bars',bar(139,191,28,255),bar(190,143,28,303),bar(242,94,28,351),bar(294,159,28,287),bar(346,198,28,248)],
    ['record',path(M(256,92),Q(390,92,390,225),Q(390,357,256,357),Q(123,357,123,225),Q(123,92,256,92),Z,M(256,177),Q(209,177,209,225),Q(209,273,256,273),Q(304,273,304,225),Q(304,177,256,177),Z),circle(256,225,14)],
    ['tuning-fork',path(M(175,96),L(202,96),L(202,206),Q(202,267,256,267),Q(310,267,310,206),L(310,96),L(337,96),L(337,206),Q(337,282,271,294),L(271,351),L(241,351),L(241,294),Q(175,280,175,206),Z)]
  ],
  marine: [
    ['sail',path(M(252,78),L(252,277),L(116,277),Z),path(M(270,121),Q(306,221,386,277),L(270,277),Z),path(M(108,292),L(402,292),L(355,327),L(153,327),Z)],
    ['tide',wave(117,211),wave(117,271)],
    ['lighthouse',path(M(208,318),L(230,163),L(282,163),L(305,318),Z),bar(226,130,60,20),path(M(210,122),L(256,87),L(303,122),Z),bar(185,327,142,17)],
    ['sun-wave',circle(260,168,57),wave(123,258)]
  ],
  architecture: [
    ['arch',path(M(125,329),L(125,218),Q(125,87,256,87),Q(388,87,388,218),L(388,329),L(344,329),L(344,218),Q(344,131,256,131),Q(169,131,169,218),L(169,329),Z)],
    ['skyline',bar(120,213,69,323),bar(203,103,85,323),bar(302,166,74,323)],
    ['gable',path(M(90,213),L(254,88),L(420,213),L(395,240),L(254,137),L(115,240),Z),path(M(149,241),L(183,216),L(183,304),L(330,304),L(330,216),L(363,241),L(363,337),L(149,337),Z)],
    ['portal',path(M(145,329),L(145,132),L(353,90),L(353,329),L(315,329),L(315,137),L(183,163),L(183,329),Z),bar(228,205,25,329)]
  ],
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

export function themedVariants(theme,primary,accent=primary,name='') {
  const marks=familiesOfMarks[theme];
  let start=0;
  if(marks.length>3){
    for(const char of name.normalize('NFC').toLowerCase()) start=(Math.imul(start,31)+char.codePointAt(0))>>>0;
    start%=marks.length;
  }
  const selected=Array.from({length:3},(_,i)=>marks[(start+i)%marks.length]);
  return selected.map(([symbol,...shapes])=>({
    symbol,document:{version:'1.0.0',width:512,height:512,layers:shapes.map((shape,i)=>({...shape,fill:shapes.length>1 && i===shapes.length-1?accent:primary}))}
  }));
}
