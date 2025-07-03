// data/gamestories.ts
import { GameStory } from '@/types/game';

export type Episode = {
  id: string;
  title: string;
  description: string;
  sceneIds: string[];
};

export type GameData = GameStory & {
  episodes: Episode[];
  projectId: string;
};

export const gameStories: Record<string, GameData> = {
  'Now or Never': {
    projectId: '1',
    episodes: [
      {
        id: 'บทนำ',
        title: 'บทนำ',
        description:
          'เมื่อเอลล่า และแฟนหนุ่มรวมถึงผองเพื่อนต้องออกปล้นเพื่อใช้หนี้ที่คฤหาสน์แห่งหนึ่ง แต่พวกเขาหารู้ไม่ ... ว่าอาจมีอะไรบางอย่างกำลังรอพวกเขาอยู่',
        sceneIds: ['scene1', 'scene1a', 'scene1b', 'scene1c', 'scene1d', 'scene1e' , 'scene1f' ,'scene1g' ,'scene1h' ,'scene1i' ,'scene1j' ,'scene1k','scene1l','scene1m','scene1n','scene1o','scene1p','scene1q','scene1r'],
      },
      {
        id: 'บทที่ 1',
        title: 'เพื่อนรัก',
        description:
          'เมื่อความสัมพันธ์ลับถูกมองเห็นโดยใครบางคน เธอคนนั้นจะตัดสินใจอย่างไร ...',
        sceneIds: ['scene2a', 'scene2b', 'scene2c','scene2d','scene2e','scene2f','scene2g','scene2h','scene2i','scene2j','scene2k','scene2l','scene2m','scene2n','scene2o','scene2p','scene2q','scene2r','scene2s','scene2t','scene2u','scene2v','scene2w',],
      },
      {
        id: 'บทที่ 2',
        title: 'ผู้ถูกเลือก',
        description:
          'เมื่อสถานการณ์ต้องบีบคั้นให้คุณกลายเป็นคนเลว คุณจะเลือกอะไรกันนะ :)',
        sceneIds: ['scene8', 'scene9', 'scene10', 'scene11', 'scene12', 'scene13', 'scene14', 'scene15', 'scene16', 'scene17'],
      },
    ],
    scenes: [
      {
        id: 'scene1',
        name: 'จุดเริ่มต้น',
        background: '/images/background/first.png',
        characters: [ 
          {
            src: '',
            name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
            props: {
              visible: false,
              transform: { x: -50, y: -40, scale: 1, rotation: 0 },//ตำแหน่ง 
            },
          },
          {
            src: '',
            name: '',
            props: {
              visible: false,
              transform: { x: 50, y: -40, scale: 1, rotation: 0 },
            },
          },
        ],
        dialogue: '',
        backgroundProps: {
          visible: true,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        textProps: {
          size: 'lg',
          alignment: 'center',
          color: '#ffffff',
          shadow: true,
          bold: false,
          italic: false,
          typewriterSpeed: 50,
        },
        audio: {
          bgm: '/audio/Epic.mp3',
          sfx: null,
          volume: 0.8,
          fadeIn: 2,
          fadeOut: 2,
        },
        nextScene: 'scene1a',
      },
      {
        id: 'scene1a',
        name: 'จุดเริ่มต้น (ต่อ)',
        background: '/images/background/home.png',
        characters: [
          {
            src: '/images/character/matthew.png',
            name: 'แมทธิว', // ชื่อคนแรกจะอยู่หน้าบน dialogue
            props: {
              visible: true,
              transform: { x: 0, y: -50, scale: 1, rotation: 0 },//ตำแหน่ง 
            },
          },
          {
            src: '',
            name: '',
            props: {
              visible: false,
              transform: { x: 0, y: -40, scale: 1, rotation: 0 },
            },
          },
          {
            src: '',
            name: '',
            props: {
              visible: false,
              transform: { x: 170, y: -40, scale: 1, rotation: 0 },
            },
          },
        ],
        dialogue: '“ไม่เอาหน่าเอลล่า เลิกทำเหมือนโลกจะแตกสักทีเถอะ เดี๋ยวพอไปถึงหน้างานเธอก็ทำได้เองนั่นแหละ”  ชายหนุ่มเอ่ยกระแทกกระทั้นอย่างหัวเสีย',
        backgroundProps: {
          visible: true,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        textProps: {
          size: 'lg',
          alignment: 'center',
          color: '#ffffff',
          shadow: true,
          bold: false,
          italic: false,
          typewriterSpeed: 50,
        },
        audio: {
          bgm: '/audio/Epic.mp3',
          sfx: null,
          volume: 0.8,
          fadeIn: 2,
          fadeOut: 2,
        },

          nextScene: 'scene1b',
      },
      
      {
        id: 'scene1b',
        name: 'สนทนา',
        background: '/images/background/home.png',
        characters: [
          {
            src: '/images/character/ella.png',
            name: 'เอลล่า',
            props: {
              visible: true,
              transform: { x: 0, y: -20, scale: 1, rotation: 0 },
            },
          },
          {
            src: '',
            name: '',
            props: {
              visible: false,
              transform: { x: 100, y: 0, scale: 1, rotation: 0 },
            },
          },
        ],
        dialogue: 'หล่อนแค่นหัวเราะ “นายมันบ้าไปแล้วแมท ผีตัวไหนเข้าสิงนายกันล่ะตอนที่นายตัดสินใจส่งยาให้พวกใต้ดิน”',
        backgroundProps: {
          visible: true,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        textProps: {
          size: 'lg',
          alignment: 'center',
          color: '#ffffff',
          shadow: true,
          bold: false,
          italic: false,
          typewriterSpeed: 50,
        },
        audio: {
          bgm: '/audio/peaceful-theme.mp3',
          sfx: null,
          volume: 0.8,
          fadeIn: 2,
          fadeOut: 2,
        },

        nextScene: 'scene1c',
    },

    {
      id: 'scene1c',
      name: 'สนทนา2',
      background: '/images/background/home.png',
      characters: [
        {
          src: '/images/character/matthew.png',
          name: 'แมทธิว',
          props: {
            visible: true,
            transform: { x: 0, y: -40, scale: 1, rotation: 0 },
          },
        },
        {
          src: '',
          name: '',
          props: {
            visible: false,
            transform: { x: 100, y: 0, scale: 1, rotation: 0 },
          },
        },
      ],
      dialogue: '“ก็ถ้าชั้นไม่โดนปล้นยาระหว่างทาง ป่านนี้เราคงรวยเละกันไปแล้ว” ชายหนุ่มกัดฟันอย่างแค้นใจ',
      backgroundProps: {
        visible: true,
        transform: { x: 0, y: 0, scale: 1, rotation: 0 },
      },
      textProps: {
        size: 'lg',
        alignment: 'center',
        color: '#ffffff',
        shadow: true,
        bold: false,
        italic: false,
        typewriterSpeed: 50,
      },
      audio: {
        bgm: '/audio/peaceful-theme.mp3',
        sfx: null,
        volume: 0.8,
        fadeIn: 2,
        fadeOut: 2,
      },

      nextScene: 'scene1d',
  },

  {
    id: 'scene1d',
    name: 'สนทนา2',
    background: '/images/background/home.png',
    characters: [
      {
        src: '/images/character/ella.png',
        name: 'เอลล่า',
        props: {
          visible: true,
          transform: { x: 0, y: -20, scale: 1, rotation: 0 },
        },
      },
      {
        src: '',
        name: '',
        props: {
          visible: false,
          transform: { x: 100, y: -50, scale: 1, rotation: 0 },
        },
      },  
    ],
    dialogue: 'หล่อนได้แต่นั่งนิ่งงันอยู่อย่างนั้น .... พลางนึกท้อแท้ใจในตัวแฟนหนุ่มของตัวเอง ชีวิตหล่อนราวกับดิ่งลงเหวแท้ๆ ตั้งแต่ที่หนีตามแมทธิวมาใช้ชีวิตในเมืองตั้งแต่ตอนอายุสิบสี่',
    backgroundProps: {
      visible: true,
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    },
    textProps: {
      size: 'lg',
      alignment: 'center',
      color: '#ffffff',
      shadow: true,
      bold: false,
      italic: false,
      typewriterSpeed: 50,
    },
    audio: {
      bgm: '/audio/peaceful-theme.mp3',
      sfx: null,
      volume: 0.8,
      fadeIn: 2,
      fadeOut: 2,
    },

    nextScene: 'scene1e',
},

{
  id: 'scene1e',
  name: 'สนทนา2',
  background: '/images/background/home.png',
  characters: [
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: -100, y: -50, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 100, y: -50, scale: 1, rotation: 0 },
      },
    },  
  ],
  dialogue: 'หากคุณเป็นเอลล่า คุณเลือกที่จะ ... (ตัวเลือกมีผลต่อเนื้อเรื่อง กรุณาเลือกอย่างระมัดระวัง)',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/peaceful-theme.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },
  choices: [
    {text: 'ร่วมปล้นเพื่อช่วยแมทธิว' , nextSceneId: 'scene2a'},
    {text: 'ไม่ช่วยแมทธิว' , nextSceneId: 'scene1g'},
  ]
},

{
  id: 'scene1g',
  name: 'สนทนา2',
  background: '/images/background/home.png',
  characters: [
    {
      src: '',
      name: '',
      props: {
        visible: true,
        transform: { x: 0, y: -100, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 100, y: 20, scale: 1, rotation: 0 },
      },
    },  
  ],
  dialogue: '+10 ค่าคุณธรรม',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/peaceful-theme.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },
  nextScene: 'scene1h',
},

{
  id: 'scene1h',
  name: 'สนทนา2',
  background: '/images/background/home.png',
  characters: [
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: -100, y: -50, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 100, y: -50, scale: 1, rotation: 0 },
      },
    },  
  ],
  dialogue: '3 วันต่อมา ...',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/peaceful-theme.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

  nextScene: 'scene1i',
},


{
  id: 'scene1i',
  name: 'สนทนา2',
  background: '/images/background/news.png',
  characters: [
    {
      src: '/images/character/mom.png',
      name: 'ผู้ประกาศข่าว',
      props: {
        visible: true,
        transform: { x: 0, y: -100, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 100, y: -50, scale: 1, rotation: 0 },
      },
    },  
  ],
  dialogue: '"มาดูกันต่อที่ข่าวสลดค่ะ เกิดเหตุฆาตกรรมโหดคู่ชายหญิงนิรนามในห้องแถวแห่งหนึ่งในรัฐแคนซัสซิตี้"',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/peaceful-theme.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

  nextScene: 'scene1j',
},

{
  id: 'scene1j',
  name: 'สนทนา2',
  background: '/images/background/blood.png',
  characters: [
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: -100, y: -50, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 100, y: -50, scale: 1, rotation: 0 },
      },
    },  
  ],
  dialogue: '"ทั้งสองถูกพบในสภาพถูกยิงเข้าที่ศรีษะ ในสถานที่เกิดเหตุพบยาเสพติดจำนวนหนึ่ง ทางตำรวจและพนักงานสืบสวนจึงตั้งเหตุแรงจูงใจในการก่อเหตุเบื้องต้นไปที่การฆาตกรรมในวงการการค้ายา ซึ่งจะทำการสืบสวนเพื่อหาต้นตอต่อไปค่ะ"',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/peaceful-theme.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

  nextScene: 'scene1k',
},

{
  id: 'scene1k',
  name: 'สนทนา2',
  background: '/images/background/news.png',
  characters: [
    {
      src: '/images/character/mom.png',
      name: 'ผู้ประกาศข่าว',
      props: {
        visible: true,
        transform: { x: 0, y: -100, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 100, y: 20, scale: 1, rotation: 0 },
      },
    },  
  ],
  dialogue: '"และนี่คือทั้งหมดในช่วงเที่ยงวันทันทุกเรื่องค่ะ มาดูกันต่อที่ข่าวกีฬา ...."',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/peaceful-theme.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },
  ending: {
    title: ' ',
    text: '"ยินดีด้วย คุณพบ 1 ใน 5 ฉากจบ ยังมีฉากจบมากมายรอให้คุณค้นพบ! ขอบคุณที่ร่วมเล่นสนุกกับพวกเรา NovelMaze"',
    image: '/images/background/badend1.png',
  },
},

{
  id: 'scene2a',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/home.png',
  characters: [
    {
      src: '',
      name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: false,
        transform: { x: 0, y: -50, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: '+20 ค่าความกล้าหาญ',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2b',
},
{
  id: 'scene2b',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/mansion.png',
  characters: [
    {
      src: '',
      name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: false,
        transform: { x: 0, y: -50, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: 'กลุ่มวัยรุ่นทั้ง 5 ปีนกำแพงสูงของคฤหาสน์เก่าแก่อย่างเงียบเชียบ ที่นำโดยแมทธิว ตามมาด้วยเอลล่า จูเลียน เกรซี่ และดีแลน ที่ต่างเป็นกลุ่มวัยรุ่นค้ายาที่ต้องการเงินเหมือนๆกัน',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2c',
},

{
  id: 'scene2c',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '/images/character/smile_gracie.png',
      name: 'เกรซี่', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: true,
        transform: { x: 0, y: 0, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: '"ดีน นายเก่งที่สุดเลย !" หญิงสาวเข้าไปกอดแขนดีแลนอย่างออเซาะหลังจากที่เขาสะเดาะกลอนประตูหลังคฤหาสน์อย่างชำนาญ แต่แล้วก็ต้องผิดหวังเหมือนอย่างเคย เมื่อลำแขนแกร่งสะบัดทิ้งอย่างไม่ไยดี',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2d',
},
{
  id: 'scene2d',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '/images/character/dylan.png',
      name: 'ดีแลน', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: true,
        transform: { x: 0, y: -50, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: '"ไปให้พ้น พวกเราจะถูกจับได้ก็เพราะเสียงแหลมโง่ๆของเธอนี่แหละ" ชายหนุ่มเอ่ยเสียงห้วน',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2e',
},
{
  id: 'scene2e',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '',
      name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: false,
        transform: { x: 0, y: -50, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: 'เกรซี่กำมือแน่น นี่ไม่ใช่ครั้งแรกที่ดีแลนหักหน้าเธอต่อหน้าคนอื่นๆ แต่ก็เพราะรักไม่ใช่หรือ ... เธอถึงโง่งมทนมาได้เอาป่านนี้',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2f',
},

{
  id: 'scene2f',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '/images/character/julian.png',
      name: 'จูเลียน', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: true,
        transform: { x: 0, y: 0, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: '"แค่กๆ" เด็กหนุ่มไอหอบเบาๆก่อนนำยาโรคหอบหืดขึ้นมาพ่นจมูก เพราะการคลุกคลีกับวงการยาใต้ดินพร้อมกับโรคหอบหืดแท้ๆ ถึงทำให้เขาอาการแย่ลงถึงขนาดที่แม้แต่การเดินนานๆก็ทำให้เขาเหนื่อยได้ถึงขนาดนี้',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2g',
},
{
  id: 'scene2g',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '/images/character/julian.png',
      name: 'จูเลียน', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: true,
        transform: { x: 0, y: 0, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: '"ฉันคิดว่าพวกเราคงต้องแยกกันหา คฤหาสน์ใหญ่ขนาดนี้กว่าจะเจอสมบัติคงเช้ากันพอดี" เขาเอ่ย ด้วยวัยเพียงสิบเก้าปีแม้จะอายุน้อยที่สุดในกลุ่ม แม้จะขี้โรคแต่เขาก็เป็นคนที่ฉลาดที่สุด',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2h',
},

{
  id: 'scene2h',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '',
      name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: 'เมื่อพูดถึงเรื่องแยกกัน เกรซี่ก็รีบเกาะติดดีแลนแจโดยไม่สนท่าทีกระฟัดกระเฟียดของเขาเลยสักนิด แมทธิวจึงหันมากล่าวกับเอลล่า',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2i',
},
{
  id: 'scene2i',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '/images/character/matthew.png',
      name: 'แมทธิว', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: true,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: '"เกรซี่คงไปกับดีแลน เธอเป็นแฟนชั้นก็ไปกับชั้นแล้วกัน" เขารวบรัดโดยไม่ถามเธอสักคำเดียว ...',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2j',
},
{
  id: 'scene2j',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '',
      name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: 'หากคุณเป็นเอลล่า คุณเลือกที่จะ ...',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },
  choices: [
    {text: 'ไปกับแมทธิว' , nextSceneId: 'scene2k'},
    {text: 'ไปกับจูเลียน' , nextSceneId: 'scene2m'},
  ]
},
{
  id: 'scene2k',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '/images/character/ella.png',
      name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: true,
        transform: { x: 0, y: -20, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: 'แต่เมื่อหล่อนคิดดูดีๆ จึงเปลี่ยนใจ',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2l',
},

{
  id: 'scene2m',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '',
      name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: false,
        transform: { x: 0, y: -20, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: '+20 ค่าคุณธรรม',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2l',
},

{
  id: 'scene2l',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '/images/character/ella.png',
      name: 'เอลล่า', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: true,
        transform: { x: 0, y: -20, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: '"ไม่ล่ะ ชั้นไปกับจูเลียนดีกว่า นายไม่เห็นรึไงว่าเขาหน้าซีดขนาดไหน" หล่อนตำหนิ',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2n',
},
{
  id: 'scene2n',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '/images/character/matthew.png',
      name: 'แมทธิว', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: true,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: '"นี่เธอบ้าไปแล้วเหรอ เธอเลือกที่จะทิ้งแฟนเธอเพื่อไปกับไอ้ขี้โรคนี่เนี่ยนะ!?" ชายหนุ่มมองจูเลียนอย่างเหยียดหยาม นานแล้วที่เขาไม่ชอบคนอ่อนแอที่รังแต่จะเป็นภาระอย่างหมอนี่',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2o',
},

{
  id: 'scene2n',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '/images/character/ella.png',
      name: 'เอลล่า', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: true,
        transform: { x: 0, y: -20, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 0, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '',
      name: '',
      props: {
        visible: false,
        transform: { x: 170, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: '"เลิกทำตัวเป็นเด็กซักที แล้วก็เลิกโวยวายได้แล้ว ก่อนที่พวกเราจะโดนจับได้เพราะนายกันไปหมด" หล่อนขมวดคิ้วอย่างไม่สบอารมณ์',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2o',
},
{
  id: 'scene2o',
  name: 'จุดเริ่มต้น (ต่อ)',
  background: '/images/background/main.png',
  characters: [
    {
      src: '/images/character/julian.png',
      name: '',
      props: {
        visible: true,
        transform: { x: 50, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '/images/character/ella.png',
      name: 'เอลล่า', // ชื่อคนแรกจะอยู่หน้าบน dialogue
      props: {
        visible: true,
        transform: { x: -140, y: -20, scale: 1, rotation: 0 },//ตำแหน่ง 
      },
    },
    {
      src: '/images/character/dylan.png',
      name: '',
      props: {
        visible: true,
        transform: { x: 360, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '/images/character/gracie.png',
      name: '',
      props: {
        visible: true,
        transform: { x: 500, y: -40, scale: 1, rotation: 0 },
      },
    },
    {
      src: '/images/character/matthew.png',
      name: '',
      props: {
        visible: true,
        transform: { x: -500, y: -40, scale: 1, rotation: 0 },
      },
    },
  ],
  dialogue: '"เอาล่ะ ทีนี้ก็แยกย้ายกันไปได้แล้ว ถ้าใครเจอสมบัติก่อนก็ส่งข้อความมาทางโทรศัพท์ก็แล้วกัน"',
  backgroundProps: {
    visible: true,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  },
  textProps: {
    size: 'lg',
    alignment: 'center',
    color: '#ffffff',
    shadow: true,
    bold: false,
    italic: false,
    typewriterSpeed: 50,
  },
  audio: {
    bgm: '/audio/Epic.mp3',
    sfx: null,
    volume: 0.8,
    fadeIn: 2,
    fadeOut: 2,
  },

    nextScene: 'scene2q',
},
      
      // Add more scenes as needed
    ],
  },

  'The chosen one': {
    projectId: '2',
    episodes: [
      {
        id: 'บทนำ',
        title: 'ลางร้าย',
        description:
          'ครอบครัวดัลลาสใช้ชีวิตอย่างปกติสุขมาโดยตลอด แต่ใครเล่าจะรู้... ว่าเหตุไม่คาดฝันที่มาจากความประมาทอาจเปลี่ยนชีวิตพวกเขาไปตลอดกาล',
        sceneIds: ['scene1','scene2','scene3','scene4' ],
      },
      {
        id: 'บทที่ 1',
        title: 'เหตุไม่คาดฝัน',
        description:
          'เมื่อมีอา เจมส์ ไลล่า 3พี่น้องรวมถึงเพื่อนรักอองรี... สุนัขพันธุ์บีเกิ้ลแสนน่ารักที่ทุกคนรักเสมือนสมาชิกในครอบครัว กลับพบกับเหตุการณ์ไม่คาดฝันขึ้นที่พวกเขาจะไม่มีวันลืมไปตลอดกาล',
        sceneIds: ['scene1a', 'scene2a', 'scene2b'],
      },
      {
        id: 'บทที่ 2',
        title: 'ถึงเวลาต้องเลือก',
        description:
          'เมื่อโชคชะตาบังคับให้คุณต้องเลือก ระหว่างความถูกต้องกับความถูกใจ แล้วคุณล่ะ... เลือกอะไร?',
        sceneIds: ['scene2c','scene39', 'scene40',],
      },
    ],
    scenes: [
      {
        id: 'scene1',
        name: 'จุดเริ่มต้น',
        background: '/images/background/train.png',
        characters: [ 
          {
            src: '/images/character/mom.png',
            name: 'หญิงชรา', // ชื่อคนแรกจะอยู่หน้าบน dialogue
            props: {
              visible: true,
              transform: { x: -50, y: -40, scale: 1, rotation: 0 },//ตำแหน่ง 
            },
          },
          {
            src: '',
            name: '',
            props: {
              visible: false,
              transform: { x: 50, y: -40, scale: 1, rotation: 0 },
            },
          },
        ],
        dialogue: '"อย่าออกไปวิ่งเล่นที่รางรถไฟนะเด็กๆ!" หญิงชราย้ำเตือนลูกๆก่อนที่เจ้าพวกตัวแสบจะออกไปวิ่งเล่น แต่ก็เหมือนสายลมที่พัดมาแล้วก็ผ่านไป เพราะกลุ่มเด็กจอมซนทั้ง 4 คนไม่แม้แต่จะหยุดฟังด้วยซ้ำ...',
        backgroundProps: {
          visible: true,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        textProps: {
          size: 'lg',
          alignment: 'center',
          color: '#ffffff',
          shadow: true,
          bold: false,
          italic: false,
          typewriterSpeed: 50,
        },
        audio: {
          bgm: '/audio/peaceful-theme.mp3',
          sfx: null,
          volume: 0.8,
          fadeIn: 2,
          fadeOut: 2,
        },
        nextScene: 'scene2',
      },
      {
        id: 'scene2',
        name: 'จุดเริ่มต้น',
        background: '/images/background/train.png',
        characters: [ 
          {
            src: '/images/character/Ana_fullbody.png',
            name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
            props: {
              visible: true,
              transform: { x: -300, y: -40, scale: 1, rotation: 0 },//ตำแหน่ง 
            },
          },
          {
            src: '/images/character/Hoshi_fullbody.png',
            name: '',
            props: {
              visible: true,
              transform: { x: -150, y: -40, scale: 1, rotation: 0 },
            },
            
          },
          {
            src: '/images/character/Cho_fullbody.png',
            name: '',
            props: {
              visible: true,
              transform: { x: 200, y: -40, scale: 1, rotation: 0 },
            },
            
          },
          {
            src: '/images/character/Riwsey_fullbody.png',
            name: '',
            props: {
              visible: true,
              transform: { x: 0, y: -40, scale: 1, rotation: 0 },
            },
            
          },
        ],
        dialogue: 'ในขณะที่เด็กๆทั้ง 4 กำลังวิ่งเล่นกันอย่างสนุกสนาน อีกด้านหนึ่งของริมทางรถไฟนั้นเอง กลับมีเด็กอีกคนหนึ่งกำลังจูงสุนัขตัวโปรดของเขาออกมาเดินเล่น...',
        backgroundProps: {
          visible: true,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        textProps: {
          size: 'lg',
          alignment: 'center',
          color: '#ffffff',
          shadow: true,
          bold: false,
          italic: false,
          typewriterSpeed: 50,
        },
        audio: {
          bgm: '/audio/peaceful-theme.mp3',
          sfx: null,
          volume: 0.8,
          fadeIn: 2,
          fadeOut: 2,
        },
        nextScene: 'scene3',
      },
      {
        id: 'scene3',
        name: 'จุดเริ่มต้น',
        background: '/images/background/slope.png',
        characters: [ 
          {
            src: '/images/character/Toya_fullbody.png',
            name: 'โทยะ', // ชื่อคนแรกจะอยู่หน้าบน dialogue
            props: {
              visible: true,
              transform: { x: -100, y: -40, scale: 1, rotation: 0 },//ตำแหน่ง 
            },
          },
          {
            src: '/images/character/dog.png',
            name: '',
            props: {
              visible: true,
              transform: { x: 50, y: 100, scale: 1, rotation: 0 },
            },
          },
        ],
        dialogue: '"ฮ่าๆๆๆ อองรี! อย่ากระโดดใส่ชั้นสิ" เด็กชายเล่นกับลูกบอลและสุนัขของเขาอย่างสนุกสนานที่ริมทางด้านใน',
        backgroundProps: {
          visible: true,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        textProps: {
          size: 'lg',
          alignment: 'center',
          color: '#ffffff',
          shadow: true,
          bold: false,
          italic: false,
          typewriterSpeed: 50,
        },
        audio: {
          bgm: '/audio/peaceful-theme.mp3',
          sfx: null,
          volume: 0.8,
          fadeIn: 2,
          fadeOut: 2,
        },
        nextScene: 'scene4',
      },
      {
        id: 'scene4',
        name: 'จุดเริ่มต้น',
        background: '/images/background/slope.png',
        characters: [ 
          {
            src: '',
            name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
            props: {
              visible: false,
              transform: { x: -100, y: -40, scale: 1, rotation: 0 },//ตำแหน่ง 
            },
          },
          {
            src: '',
            name: '',
            props: {
              visible: false,
              transform: { x: 50, y: 100, scale: 1, rotation: 0 },
            },
          },
        ],
        dialogue: 'จนกระทั่ง ...',
        backgroundProps: {
          visible: true,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        textProps: {
          size: 'lg',
          alignment: 'center',
          color: '#ffffff',
          shadow: true,
          bold: false,
          italic: false,
          typewriterSpeed: 50,
        },
        audio: {
          bgm: '/audio/peaceful-theme.mp3',
          sfx: null,
          volume: 0.8,
          fadeIn: 2,
          fadeOut: 2,
        },
        nextScene: 'scene1a',
      },
      {
        id: 'scene1a',
        name: 'จุดเริ่มต้น',
        background: '/images/background/train.png',
        characters: [ 
          {
            src: '/images/character/Toya_fullbody.png',
            name: 'โทยะ', // ชื่อคนแรกจะอยู่หน้าบน dialogue
            props: {
              visible: true,
              transform: { x: -100, y: -40, scale: 1, rotation: 0 },//ตำแหน่ง 
            },
          },
          {
            src: '',
            name: '',
            props: {
              visible: false,
              transform: { x: 50, y: 100, scale: 1, rotation: 0 },
            },
          },
        ],
        dialogue: '"อองรี! ระวัง!!"',
        backgroundProps: {
          visible: true,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        textProps: {
          size: 'lg',
          alignment: 'center',
          color: '#ffffff',
          shadow: true,
          bold: false,
          italic: false,
          typewriterSpeed: 50,
        },
        audio: {
          bgm: '/audio/peaceful-theme.mp3',
          sfx: null,
          volume: 0.8,
          fadeIn: 2,
          fadeOut: 2,
        },
        nextScene: 'scene2a',
      },
      {
        id: 'scene2a',
        name: 'จุดเริ่มต้น',
        background: '/images/background/train.png',
        characters: [ 
          {
            src: '/images/character/dog.png',
            name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
            props: {
              visible: true,
              transform: { x: -50, y: 0, scale: 1, rotation: 0 },//ตำแหน่ง 
            },
          },
          {
            src: '',
            name: '',
            props: {
              visible: false,
              transform: { x: 50, y: 100, scale: 1, rotation: 0 },
            },
          },
        ],
        dialogue: 'เจ้าสุนัขอองรีที่กำลังสนุกกับการกระโดดไล่งับลูกบอล เมื่อเห็นตกลงไปติดในรางรถไฟ มันจึงไม่ลังเลเลยที่จะกระโดดลงไปเพื่อพยายามเอาลูกบอลออกมา ทำให้มันกำลังกระโจนไปสู่ความตาย... ซึ่งคือรถไฟที่กำลังขับมาด้วยความเร็วสูง',
        backgroundProps: {
          visible: true,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        textProps: {
          size: 'lg',
          alignment: 'center',
          color: '#ffffff',
          shadow: true,
          bold: false,
          italic: false,
          typewriterSpeed: 50,
        },
        audio: {
          bgm: '/audio/peaceful-theme.mp3',
          sfx: null,
          volume: 0.8,
          fadeIn: 2,
          fadeOut: 2,
        },
        nextScene: 'scene2b',
      },
      {
        id: 'scene2b',
        name: 'จุดเริ่มต้น',
        background: '/images/background/train.png',
        characters: [ 
          {
            src: '/images/character/Ana_fullbody.png',
            name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
            props: {
              visible: true,
              transform: { x: -300, y: -40, scale: 1, rotation: 0 },//ตำแหน่ง 
            },
          },
          {
            src: '/images/character/Hoshi_fullbody.png',
            name: '',
            props: {
              visible: true,
              transform: { x: -150, y: -40, scale: 1, rotation: 0 },
            },
            
          },
          {
            src: '/images/character/Cho_fullbody.png',
            name: '',
            props: {
              visible: true,
              transform: { x: 200, y: -40, scale: 1, rotation: 0 },
            },
            
          },
          {
            src: '/images/character/Riwsey_fullbody.png',
            name: '',
            props: {
              visible: true,
              transform: { x: 0, y: -40, scale: 1, rotation: 0 },
            },
            
          },
        ],
        dialogue: 'ส่วนอีกด้านหนึ่งของราง เด็กทั้ง 4 คนที่มัวแต่วิ่งเล่นจนกระทั่งขาติดในรางรถไฟ ที่ไม่ว่าจะพยายามเท่าไหร่ก็ไม่สามารถเอาขาออกมาจากรางได้',
        backgroundProps: {
          visible: true,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        textProps: {
          size: 'lg',
          alignment: 'center',
          color: '#ffffff',
          shadow: true,
          bold: false,
          italic: false,
          typewriterSpeed: 50,
        },
        audio: {
          bgm: '/audio/peaceful-theme.mp3',
          sfx: null,
          volume: 0.8,
          fadeIn: 2,
          fadeOut: 2,
        },
        nextScene: 'scene2c',
      },
      {
        id: 'scene2c',
        name: 'จุดเริ่มต้น',
        background: '/images/background/train.png',
        characters: [ 
          {
            src: '/images/character/Ana_fullbody.png',
            name: '', // ชื่อคนแรกจะอยู่หน้าบน dialogue
            props: {
              visible: true,
              transform: { x: 400, y: -40, scale: 1, rotation: 0 },//ตำแหน่ง 
            },
          },
          {
            src: '/images/character/Hoshi_fullbody.png',
            name: '',
            props: {
              visible: true,
              transform: { x: 300, y: -40, scale: 1, rotation: 0 },
            },
            
          },
          {
            src: '/images/character/Cho_fullbody.png',
            name: '',
            props: {
              visible: true,
              transform: { x: 180, y: -40, scale: 1, rotation: 0 },
            },
            
          },
          {
            src: '/images/character/Riwsey_fullbody.png',
            name: '',
            props: {
              visible: true,
              transform: { x: 90, y: -40, scale: 1, rotation: 0 },
            },
            
          },
          {
            src: '/images/character/dog.png',
            name: '',
            props: {
              visible: true,
              transform: { x: -170, y: 0, scale: 1, rotation: 0 },
            },
            
          },
        ],
        dialogue: 'ทางรถไฟนั้นเป็นทางแยก 2 ทาง ทางหนึ่งเป็นเด็กส่วนอีกทางเป็นสุนัข ที่ทั้งคู่กำลังติดอยู่ในรางรถไฟ หากคุณเป็นเจ้าหน้าที่ควบคุมรถไฟคุณจะเลือกสับรางไปในเส้นทางใด',
        backgroundProps: {
          visible: true,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        textProps: {
          size: 'lg',
          alignment: 'center',
          color: '#ffffff',
          shadow: true,
          bold: false,
          italic: false,
          typewriterSpeed: 50,
        },
        audio: {
          bgm: '/audio/peaceful-theme.mp3',
          sfx: null,
          volume: 0.8,
          fadeIn: 2,
          fadeOut: 2,
        },
        choices: [
          {text: 'สับรางไปยังทางที่มีสุนัข' , nextSceneId: 'scene39'},
          {text: 'สับรางไปยังทางที่มีเด็ก' , nextSceneId: 'scene39'},
        ]

      },
      {
        id: 'scene39',
        name: 'end',
        background: '/images/background/result.png',
        characters: [ 
          {
            src: '',
            name: '',
            props: {
              visible: false,
              transform: { x: 200, y: -40, scale: 1, rotation: 0 },
            },
            
          },
          {
            src: '',
            name: '',
            props: {
              visible: false,
              transform: { x: 0, y: -40, scale: 1, rotation: 0 },
            },
            
          },
        ],
        dialogue: 'และนี่คือผลลัพธ์อุปนิสัยของคุณแบบคร่าวๆ ขอบคุณที่ร่วมเล่นสนุกกับพวกเรา PATHY!',
        backgroundProps: {
          visible: true,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        textProps: {
          size: 'lg',
          alignment: 'center',
          color: '#ffffff',
          shadow: true,
          bold: false,
          italic: false,
          typewriterSpeed: 50,
        },
        audio: {
          bgm: '/audio/peaceful-theme.mp3',
          sfx: null,
          volume: 0.8,
          fadeIn: 2,
          fadeOut: 2,
        },
        ending: {
          title: ' ',
          text: 'และนี่คือผลลัพธ์อุปนิสัยของคุณแบบคร่าวๆ ขอบคุณที่ร่วมเล่นสนุกกับพวกเรา PATHY!',
          image: '/images/background/result.png',
        },
      },
    ],
  },
  
};