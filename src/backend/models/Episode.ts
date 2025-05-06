// src/backend/models/Episode.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Episode document
export interface IEpisode extends Document {
  title: string; // ชื่อตอน
  slug: string; // URL slug
  novel: Types.ObjectId; // อ้างอิงไปยังนิยาย
  episodeNumber: number; // ลำดับตอน
  summary?: string; // สรุปเนื้อหาตอน (สำหรับแสดงในหน้า overview)
  thumbnail?: string; // รูปปกตอน
  isPremium: boolean; // เป็นตอนพรีเมียมหรือไม่
  price: number; // ราคา (ถ้าเป็นตอนพรีเมียม)
  isPublished: boolean; // สถานะการเผยแพร่
  publishedAt?: Date; // วันที่เผยแพร่

  // ข้อมูลเพิ่มเติมสำหรับ Visual Novel
  storyStructure: { // โครงสร้างเรื่อง
    type: "linear" | "branching" | "hybrid"; // รูปแบบการเล่าเรื่อง
    startScene: Types.ObjectId; // ฉากเริ่มต้น
    defaultEnding?: Types.ObjectId; // ฉากจบเริ่มต้น
    branchingPoints?: Array<{ // จุดแยกเส้นเรื่อง (สำหรับแบบ branching)
      scene: Types.ObjectId; // ฉากที่มีการแยก
      choices: Array<{
        text: string; // ข้อความตัวเลือก
        nextScene: Types.ObjectId; // ฉากถัดไป
        condition?: string; // เงื่อนไข (ถ้ามี)
      }>;
    }>;
    endings?: Array<{ // จุดจบต่างๆ (สำหรับเรื่องที่มีหลายจุดจบ)
      scene: Types.ObjectId; // ฉากจบ
      title: string; // ชื่อจุดจบ
      description?: string; // คำอธิบาย
      unlockCondition?: string; // เงื่อนไขการปลดล็อค
    }>;
  };
  
  authorNotes?: string; // บันทึกของผู้เขียน
  readingTime: number; // เวลาในการอ่านโดยประมาณ (นาที)
  wordCount: number; // จำนวนคำ
  sceneCount: number; // จำนวนฉาก
  dialogueCount: number; // จำนวนบทสนทนา
  choiceCount: number; // จำนวนตัวเลือก
  characterCount: number; // จำนวนตัวละครที่ปรากฏ
  
  stats: {
    views: number; // จำนวนเข้าชม
    likes: number; // จำนวนไลค์
    comments: number; // จำนวนคอมเมนต์
    purchases: number; // จำนวนการซื้อ
    completionRate: number; // อัตราการอ่านจบ (0-100%)
    averageRating: number; // คะแนนเฉลี่ย (0-5)
    popularChoices?: Record<string, number>; // สถิติการเลือกตัวเลือกที่นิยม
  };
  
  settings: {
    fontFamily?: string; // แบบอักษรเริ่มต้น
    textSpeed?: number; // ความเร็วข้อความ (1-10)
    autoAdvance?: boolean; // เลื่อนบทสนทนาอัตโนมัติ
    textboxStyle?: string; // สไตล์กล่องข้อความ
    dialoguePosition?: string; // ตำแหน่งบทสนทนา
    effectsEnabled?: boolean; // เปิดใช้งานเอฟเฟกต์
    bgmVolume?: number; // ระดับเสียงดนตรีประกอบ
    sfxVolume?: number; // ระดับเสียงประกอบ
    voiceVolume?: number; // ระดับเสียงพูด
  };
  
  version: number; // เวอร์ชันของเนื้อหา
  history: Array<{
    version: number; // เวอร์ชัน
    updatedAt: Date; // วันที่อัพเดต
    changeDescription?: string; // คำอธิบายการเปลี่ยนแปลง
  }>;
  
  editorState?: string; // สถานะของ editor (JSON string)
  isDeleted: boolean; // สถานะการลบ (soft delete)
}

const EpisodeSchema = new Schema<IEpisode>(
  {
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อตอน"],
      trim: true,
      maxlength: [200, "ชื่อตอนต้องไม่เกิน 200 ตัวอักษร"],
    },
    slug: {
      type: String,
      required: [true, "กรุณาระบุ slug URL"],
      trim: true,
      lowercase: true,
      maxlength: [200, "Slug ต้องไม่เกิน 200 ตัวอักษร"],
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug ต้องประกอบด้วยตัวอักษรพิมพ์เล็ก, ตัวเลข และเครื่องหมาย - เท่านั้น"],
    },
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: [true, "กรุณาระบุนิยาย"],
      index: true,
    },
    episodeNumber: {
      type: Number,
      required: [true, "กรุณาระบุลำดับตอน"],
      min: [1, "ลำดับตอนต้องเป็นเลขบวก"],
      index: true,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [1000, "สรุปเนื้อหาต้องไม่เกิน 1000 ตัวอักษร"],
    },
    thumbnail: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/|^\//.test(v),
        message: "รูปแบบ URL ของรูปปกไม่ถูกต้อง",
      },
    },
    isPremium: {
      type: Boolean,
      default: false,
      index: true,
    },
    price: {
      type: Number,
      default: 0,
      min: [0, "ราคาต้องไม่ติดลบ"],
      validate: {
        validator: function(this: IEpisode, v: number) {
          return !this.isPremium || v > 0;
        },
        message: "ตอนพรีเมียมต้องมีราคามากกว่า 0",
      },
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
    },
    storyStructure: {
      type: {
        type: String,
        enum: {
          values: ["linear", "branching", "hybrid"],
          message: "รูปแบบการเล่าเรื่อง {VALUE} ไม่ถูกต้อง",
        },
        default: "linear",
      },
      startScene: {
        type: Schema.Types.ObjectId,
        ref: "Scene",
      },
      defaultEnding: {
        type: Schema.Types.ObjectId,
        ref: "Scene",
      },
      branchingPoints: [
        {
          scene: {
            type: Schema.Types.ObjectId,
            ref: "Scene",
          },
          choices: [
            {
              text: String,
              nextScene: {
                type: Schema.Types.ObjectId,
                ref: "Scene",
              },
              condition: String,
            },
          ],
        },
      ],
      endings: [
        {
          scene: {
            type: Schema.Types.ObjectId,
            ref: "Scene",
          },
          title: String,
          description: String,
          unlockCondition: String,
        },
      ],
    },
    authorNotes: {
      type: String,
      maxlength: [5000, "บันทึกของผู้เขียนต้องไม่เกิน 5000 ตัวอักษร"],
    },
    readingTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    wordCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sceneCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dialogueCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    choiceCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    characterCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    stats: {
      views: {
        type: Number,
        default: 0,
        min: 0,
      },
      likes: {
        type: Number,
        default: 0,
        min: 0,
      },
      comments: {
        type: Number,
        default: 0,
        min: 0,
      },
      purchases: {
        type: Number,
        default: 0,
        min: 0,
      },
      completionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      popularChoices: Schema.Types.Mixed,
    },
    settings: {
      fontFamily: String,
      textSpeed: {
        type: Number,
        min: 1,
        max: 10,
        default: 5,
      },
      autoAdvance: {
        type: Boolean,
        default: false,
      },
      textboxStyle: String,
      dialoguePosition: {
        type: String,
        enum: ["bottom", "top", "middle", "left", "right", "custom"],
        default: "bottom",
      },
      effectsEnabled: {
        type: Boolean,
        default: true,
      },
      bgmVolume: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.7,
      },
      sfxVolume: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.7,
      },
      voiceVolume: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.8,
      },
    },
    version: {
      type: Number,
      default: 1,
    },
    history: [
      {
        version: Number,
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        changeDescription: String,
      },
    ],
    editorState: String,
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound Index
EpisodeSchema.index({ novel: 1, episodeNumber: 1 }, { unique: true });
EpisodeSchema.index({ novel: 1, slug: 1 }, { unique: true });
EpisodeSchema.index({ novel: 1, isPublished: 1, publishedAt: -1 });
EpisodeSchema.index({ isPremium: 1, price: 1 });

// Middleware: สร้างสรุปสถิติก่อนบันทึก
EpisodeSchema.pre("save", async function(next) {
  try {
    if (this.isModified("storyStructure") || this.isNew) {
      // คำนวณสถิติเกี่ยวกับฉากและบทสนทนา
      const SceneModel = mongoose.model("Scene");
      const scenes = await SceneModel.find({ 
        episode: this._id, 
        isDeleted: false 
      });
      
      this.sceneCount = scenes.length;
      
      let totalDialogues = 0;
      let totalChoices = 0;
      let totalWords = 0;
      let characters = new Set();
      
      scenes.forEach(scene => {
        if (scene.dialogues) {
          totalDialogues += scene.dialogues.length;
          
          // นับจำนวนตัวเลือก
          scene.dialogues.forEach((dialogue: { choices: string | any[]; text: { split: (arg0: RegExp) => { (): any; new(): any; length: number; }; }; }) => {
            if (dialogue.choices) {
              totalChoices += dialogue.choices.length;
            }
            
            // นับจำนวนคำ (ประมาณการณ์)
            if (dialogue.text) {
              totalWords += dialogue.text.split(/\s+/).length;
            }
          });
        }
        
        // นับจำนวนตัวละครที่ไม่ซ้ำกัน
        if (scene.characters) {
          scene.characters.forEach((character: { name: unknown; }) => {
            if (character.name) {
              characters.add(character.name);
            }
          });
        }
      });
      
      this.dialogueCount = totalDialogues;
      this.choiceCount = totalChoices;
      this.wordCount = totalWords;
      this.characterCount = characters.size;
      
      // คำนวณเวลาในการอ่านโดยประมาณ (นาที)
      // สมมติว่า 1 นาทีต่อ 200 คำ + เพิ่มเวลาสำหรับเอฟเฟกต์และแอนิเมชัน
      const baseTime = totalWords / 200;
      const effectTime = this.sceneCount * 0.2; // เพิ่มเวลาสำหรับเอฟเฟกต์และการเปลี่ยนฉาก
      this.readingTime = Math.ceil(baseTime + effectTime);
    }
    
    // อัพเดตประวัติการแก้ไข
    if (this.isModified() && !this.isNew) {
      this.version += 1;
      this.history.push({
        version: this.version,
        updatedAt: new Date(),
      });
    }
    
    // ตั้งค่าวันที่เผยแพร่ถ้าเป็นการเผยแพร่ครั้งแรก
    if (this.isPublished && !this.publishedAt) {
      this.publishedAt = new Date();
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Virtuals
EpisodeSchema.virtual("scenes", {
  ref: "Scene",
  localField: "_id",
  foreignField: "episode",
  justOne: false,
  options: { sort: { order: 1 } },
});

EpisodeSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "episode",
  justOne: false,
});

// Export Model
const EpisodeModel = () => 
  models.Episode as mongoose.Model<IEpisode> || model<IEpisode>("Episode", EpisodeSchema);

export default EpisodeModel;