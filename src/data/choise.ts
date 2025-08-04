const createtheyearbooksecretchoices = async (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) => {
    const choices = [
        // ตอนที่ 1: การพบกันครั้งแรกกับ...ความเข้าใจผิด
        {
            novelId,
            authorId,
            version: 1, // หรือเวอร์ชันอื่นๆ ตามที่คุณต้องการ
            originStoryMapNodeId: 'scene_ep1_choices',
            choiceCode: 'CHOICE_INTRO_FRIENDLY',
            text: 'ยิ้มตอบและแนะนำตัวเองอย่างเป็นมิตร: "ฉันชื่อ [ชื่อคุณ] ค่ะ ยินดีที่ได้รู้จักนะคะฟ้าใส"',
            hoverText: 'แสดงความเป็นมิตรกับฟ้าใส',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_up',
                    type: 'modify_character_relationship', // หรือ type ที่เหมาะสมสำหรับการปรับความสัมพันธ์
                    parameters: {
                        characterCode: 'fah_sai', // อ้างอิงถึง characterCode ของฟ้าใส
                        changeValue: 10, // ค่าที่เพิ่มขึ้น (ตัวอย่าง)
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_next_node_A', // สมมติว่ามี node ถัดไปสำหรับตัวเลือกนี้
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_after_choice_A' // แทนที่ด้วย ID ของ node ถัดไป
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['เป็นมิตร', 'ยินดี', 'สุภาพ'],
            psychologicalImpactScore: 3,
            feedbackTextAfterSelection: 'ฟ้าใสรู้สึกเป็นมิตรกับคุณมากขึ้น',
            isArchived: false,
            displayOrder: 1
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep1_choices',
            choiceCode: 'CHOICE_INTRO_CONFUSED_DIN',
            text: 'ทำหน้างงๆ กับท่าทีของดิน: "เขาเป็นคนแบบนี้เหรอคะ? ดูน่ากลัวจัง..."',
            hoverText: 'แสดงความสับสนเกี่ยวกับดินต่อฟ้าใส',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_up_2',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 8, // ค่าที่เพิ่มขึ้น (ตัวอย่าง)
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_next_node_B',
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_after_choice_B' // แทนที่ด้วย ID ของ node ถัดไป
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['สับสน', 'สงสัย', 'ไร้เดียงสา'],
            psychologicalImpactScore: 2,
            feedbackTextAfterSelection: 'ฟ้าใสพยายามอธิบายดินให้คุณเข้าใจ',
            isArchived: false,
            displayOrder: 2
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep1_choices',
            choiceCode: 'CHOICE_INTRO_QUESTION_DIN',
            text: 'สงสัยในตัวดิน: "ทำไมเขาดูเหมือนไม่ชอบฉันเลย ทั้งที่เราเพิ่งเจอกัน..."',
            hoverText: 'ตั้งคำถามถึงท่าทีของดินกับฟ้าใส',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_up_3',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 7, // ค่าที่เพิ่มขึ้น (ตัวอย่าง)
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_next_node_C',
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_after_choice_C' // แทนที่ด้วย ID ของ node ถัดไป
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['สงสัย', 'ข้องใจ', 'ช่างสังเกต'],
            psychologicalImpactScore: 3,
            feedbackTextAfterSelection: 'ฟ้าใสปลอบใจและอธิบายให้คุณสบายใจ',
            isArchived: false,
            displayOrder: 3
        },
        // Choices for Episode 2: บทเรียนที่ไม่คาดฝัน
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep2_choices',
            choiceCode: 'CHOICE_MATH_THANK_DIN',
            text: 'ขอบคุณดินอย่างจริงใจ: "ขอบคุณนะดิน เข้าใจขึ้นเยอะเลย!"',
            hoverText: 'แสดงความขอบคุณต่อดิน',
            actions: [
                {
                    actionId: 'action_din_rel_up_ep2',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'din',
                        changeValue: 10,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_2A',
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_after_choice_2A'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['ขอบคุณ', 'ประทับใจ', 'เป็นมิตร'],
            psychologicalImpactScore: 5,
            feedbackTextAfterSelection: 'ความสัมพันธ์กับดินเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 4 // ต่อจากตัวเลือกก่อนหน้า
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep2_choices',
            choiceCode: 'CHOICE_MATH_IGNORE_DIN',
            text: 'แกล้งทำเป็นไม่ได้ยิน แล้วหันไปสนใจครู: "เข้าใจแล้วค่ะคุณครู"',
            hoverText: 'เลือกที่จะไม่ตอบโต้ดิน',
            actions: [
                {
                    actionId: 'action_din_rel_down_ep2',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'din',
                        changeValue: -5, // ความสัมพันธ์ลดลงเล็กน้อย
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_2B',
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_after_choice_2B'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['หลีกเลี่ยง', 'ไม่แน่ใจ'],
            psychologicalImpactScore: 2,
            feedbackTextAfterSelection: 'ความสัมพันธ์กับดินลดลงเล็กน้อย',
            isArchived: false,
            displayOrder: 5
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep2_choices',
            choiceCode: 'CHOICE_MATH_QUESTION_DIN',
            text: 'แอบสงสัยว่าเขาช่วยเพราะอะไร: "นาย...ช่วยฉันทำไม?"',
            hoverText: 'แสดงความสงสัยในตัวดิน',
            actions: [
                {
                    actionId: 'action_din_rel_neutral_ep2',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'din',
                        changeValue: 0, // หรืออาจจะเพิ่ม/ลดเล็กน้อยตามการตีความ
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_2C',
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_after_choice_2C'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['สงสัย', 'ตรงไปตรงมา'],
            psychologicalImpactScore: 4,
            feedbackTextAfterSelection: 'ดินตอบกลับด้วยท่าทีเฉยเมย',
            isArchived: false,
            displayOrder: 6
        },
        // ตอนที่ 3: การพบกันครั้งที่สองกับ...ความเข้าใจผิด
        // Choice A: ตอบรับคำชวนของฟ้าใสอย่างกระตือรือร้น
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep3_choices',
            choiceCode: 'CHOICE_EP3_JOIN_MUSIC_CLUB_FAHSAI',
            text: 'ตอบรับคำชวนของฟ้าใสอย่างกระตือรือร้น: "ได้เลยค่ะ! ฟ้าใสชวนขนาดนี้ต้องไปลองดูแล้ว"',
            hoverText: 'แสดงความสนใจในชมรมดนตรีและเข้าหาฟ้าใส',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_up_ep3_A',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 15, // เพิ่มความสัมพันธ์กับฟ้าใสอย่างชัดเจน
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_ep4_choice_A_music_club', // ไปยังฉากเริ่มต้นของตอนที่ 4 กรณี A
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_ep4_choice_A_music_club'
                    }
                }
            ],
            isMajorChoice: true, // เป็นตัวเลือกหลักที่ส่งผลต่อเส้นทาง
            associatedEmotionTags: ['กระตือรือร้น', 'เป็นมิตร', 'ความสนใจ'],
            psychologicalImpactScore: 6,
            feedbackTextAfterSelection: 'ฟ้าใสรู้สึกยินดีอย่างมาก! ความสัมพันธ์กับฟ้าใสเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 1
        },
        // Choice B: แกล้งเดินไปชนดิน เพื่อพูดคุย
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep3_choices',
            choiceCode: 'CHOICE_EP3_BUMP_INTO_DIN',
            text: 'แกล้งเดินไปชนดิน เพื่อพูดคุย: (เดินไปชนดินเบาๆ) "โอ๊ย! ขอโทษค่ะดิน ฉันไม่ได้ตั้งใจ"',
            hoverText: 'พยายามสร้างปฏิสัมพันธ์กับดิน',
            actions: [
                {
                    actionId: 'action_din_rel_up_ep3_B',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'din',
                        changeValue: 10, // เพิ่มความสัมพันธ์กับดิน
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_ep4_choice_B_art_club', // ไปยังฉากเริ่มต้นของตอนที่ 4 กรณี B
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_ep4_choice_B_art_club'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['กล้าหาญ', 'อยากรู้อยากเห็น', 'ซุ่มซ่าม'],
            psychologicalImpactScore: 7,
            feedbackTextAfterSelection: 'ดินดูจะรำคาญ แต่ก็อาจจะเริ่มสนใจคุณขึ้นมาบ้าง! ความสัมพันธ์กับดินเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 2
        },
        // Choice C: บอกฟ้าใสว่าขอเดินดูเองก่อน
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep3_choices',
            choiceCode: 'CHOICE_EP3_EXPLORE_ALONE',
            text: 'บอกฟ้าใสว่าขอเดินดูเองก่อน: "ขอบคุณนะฟ้าใส แต่ฉันขอเดินดูอีกสักหน่อยดีกว่า" (แล้วแอบมองดินที่กำลังเดินห่างออกไป)',
            hoverText: 'เลือกที่จะสำรวจด้วยตัวเองและแอบสนใจดิน',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_down_ep3_C',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: -5, // ความสัมพันธ์กับฟ้าใสลดลงเล็กน้อย
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_din_rel_up_ep3_C',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'din',
                        changeValue: 5, // ความสัมพันธ์กับดินเพิ่มขึ้นเล็กน้อยจากการสังเกต
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_ep4_choice_C_explore_art', // ไปยังฉากเริ่มต้นของตอนที่ 4 กรณี C
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_ep4_choice_C_explore_art'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['เป็นตัวของตัวเอง', 'อยากรู้อยากเห็น', 'ลังเล'],
            psychologicalImpactScore: 4,
            feedbackTextAfterSelection: 'ฟ้าใสดูจะผิดหวังเล็กน้อย แต่คุณก็มีโอกาสสังเกตดินมากขึ้น',
            isArchived: false,
            displayOrder: 3
        },
        // ตอนที่ 8: การพบกันครั้งที่สองกับ...ความเข้าใจผิด
        // Choice A: พยายามเข้าช่วยเหลือฟ้าใสและชมรมดนตรี
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep8_choices',
            choiceCode: 'CHOICE_EP8_HELP_FAHSAI_MUSIC',
            text: 'พยายามเข้าช่วยเหลือฟ้าใสและชมรมดนตรี: (วิ่งไปหาฟ้าใส) "ฟ้าใส! ไม่เป็นไรนะ? มีอะไรให้ฉันช่วยไหม?"',
            hoverText: 'ให้ความสำคัญกับความรู้สึกของฟ้าใสและพยายามช่วยแก้ไขปัญหาที่เกิดกับชมรมดนตรี',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_up_ep8_A',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 15,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_ep9_path_fahsai', // ไปยังฉากเริ่มต้นของตอนที่ 9 (เส้นทางฟ้าใส)
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_ep9_path_fahsai'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['ห่วงใย', 'เสียสละ', 'มิตรภาพ'],
            psychologicalImpactScore: 7,
            feedbackTextAfterSelection: 'ฟ้าใสรู้สึกซาบซึ้งใจ! ความสัมพันธ์กับฟ้าใสเพิ่มขึ้นอย่างมาก',
            isArchived: false,
            displayOrder: 1
        },
        // Choice B: เข้าไปสังเกตการณ์ใกล้ๆ ดินและสายไฟที่ชำรุด
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep8_choices',
            choiceCode: 'CHOICE_EP8_OBSERVE_DIN',
            text: 'เข้าไปสังเกตการณ์ใกล้ๆ ดินและสายไฟที่ชำรุด: (เดินไปใกล้ดิน) "ดิน...นายรู้อะไรเกี่ยวกับเรื่องนี้ไหม?"',
            hoverText: 'สงสัยในตัวดินและพยายามหาข้อมูลจากเขา',
            actions: [
                {
                    actionId: 'action_din_rel_up_ep8_B',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'din',
                        changeValue: 10,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_ep9_path_din', // ไปยังฉากเริ่มต้นของตอนที่ 9 (เส้นทางดิน)
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_ep9_path_din'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['อยากรู้อยากเห็น', 'ช่างสังเกต', 'รอบคอบ'],
            psychologicalImpactScore: 6,
            feedbackTextAfterSelection: 'ดินดูจะประหลาดใจเล็กน้อย! ความสัมพันธ์กับดินเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 2
        },
        // Choice C: แจ้งคุณครูผู้ดูแลงานและรอคำสั่ง
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep8_choices',
            choiceCode: 'CHOICE_EP8_REPORT_TEACHER',
            text: 'แจ้งคุณครูผู้ดูแลงานและรอคำสั่ง: (เดินไปหาคุณครู) "คุณครูคะ! หนูเห็นสายไฟตรงนั้นมีปัญหาค่ะ"',
            hoverText: 'เลือกที่จะทำตามระเบียบและแจ้งผู้มีอำนาจ',
            actions: [
                {
                    actionId: 'action_teacher_rel_up_ep8_C',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'somsri', // หากครูสมศรีคือผู้ดูแลงาน
                        changeValue: 5,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_ep9_path_neutral', // ไปยังฉากเริ่มต้นของตอนที่ 9 (เส้นทางกลาง)
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_ep9_path_neutral'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['มีวินัย', 'รอบคอบ', 'เคารพกฎ'],
            psychologicalImpactScore: 4,
            feedbackTextAfterSelection: 'คุณครูขอบคุณคุณ! ความสัมพันธ์กับครูสมศรีเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 3
        },
        // ตอนที่ 11: การพบกันครั้งที่สามกับ...ความเข้าใจผิด
        // Choice A: เลือกตอบรับคำชวนของดิน
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep11_choices',
            choiceCode: 'CHOICE_EP11_ACCEPT_DIN_INVITE',
            text: 'เลือกตอบรับคำชวนของดิน: "ฟังนายเล่นดนตรีเหรอ...ก็น่าสนใจดีนะ ฉันอยากลองฟังดู"',
            hoverText: 'เลือกที่จะใกล้ชิดดินมากขึ้นและสำรวจมุมที่ซ่อนอยู่ของเขา',
            actions: [
                {
                    actionId: 'action_din_rel_up_ep11_A',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'din',
                        changeValue: 20, // เพิ่มความสัมพันธ์กับดินอย่างมาก
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_fah_sai_rel_down_ep11_A',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: -5, // ความสัมพันธ์กับฟ้าใสลดลงเล็กน้อย
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_ep12_path_din', // ไปยังฉากเริ่มต้นของตอนที่ 12 (เส้นทางดิน)
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_ep12_path_din'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['อยากรู้อยากเห็น', 'ความกล้า', 'โรแมนติก'],
            psychologicalImpactScore: 8,
            feedbackTextAfterSelection: 'คุณตัดสินใจที่จะใกล้ชิดดินมากขึ้น! ความสัมพันธ์กับดินเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 1
        },
        // Choice B: เลือกตอบรับคำชวนของฟ้าใส
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep11_choices',
            choiceCode: 'CHOICE_EP11_ACCEPT_FAHSAI_INVITE',
            text: 'เลือกตอบรับคำชวนของฟ้าใส: "แน่นอนสิฟ้าใส! เรื่องหนังก็ดีนะ ส่วนเรื่องเลือกเพลงฉันก็ช่วยเต็มที่อยู่แล้ว!"',
            hoverText: 'เลือกที่จะใกล้ชิดฟ้าใสมากขึ้นและให้ความสำคัญกับมิตรภาพ/ความรู้สึกของเธอ',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_up_ep11_B',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 20, // เพิ่มความสัมพันธ์กับฟ้าใสอย่างมาก
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_din_rel_down_ep11_B',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'din',
                        changeValue: -5, // ความสัมพันธ์กับดินลดลงเล็กน้อย
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_ep12_path_fahsai', // ไปยังฉากเริ่มต้นของตอนที่ 12 (เส้นทางฟ้าใส)
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_ep12_path_fahsai'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['เป็นมิตร', 'ความภักดี', 'ความสุข'],
            psychologicalImpactScore: 8,
            feedbackTextAfterSelection: 'ฟ้าใสรู้สึกดีใจอย่างมาก! ความสัมพันธ์กับฟ้าใสเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 2
        },
        // Choice C: เลือกที่จะยังไม่ตัดสินใจทันที
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep11_choices',
            choiceCode: 'CHOICE_EP11_NO_DECISION_YET',
            text: 'เลือกที่จะยังไม่ตัดสินใจทันที: "ฉันขอคิดดูก่อนนะ...ทั้งสองเรื่องเลย" (แล้วพยายามหาทางพูดคุยกับทั้งคู่ในภายหลัง)',
            hoverText: 'ต้องการเวลาตัดสินใจและประเมินสถานการณ์',
            actions: [
                {
                    actionId: 'action_din_rel_neutral_ep11_C',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'din',
                        changeValue: 0, // ความสัมพันธ์ไม่เปลี่ยนแปลงมากนัก
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_fah_sai_rel_neutral_ep11_C',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 0, // ความสัมพันธ์ไม่เปลี่ยนแปลงมากนัก
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_ep12_path_neutral', // ไปยังฉากเริ่มต้นของตอนที่ 12 (เส้นทางกลาง)
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_ep12_path_neutral'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['ลังเล', 'รอบคอบ', 'ช่างคิด'],
            psychologicalImpactScore: 5,
            feedbackTextAfterSelection: 'ทั้งดินและฟ้าใสรับทราบการตัดสินใจของคุณ...แต่ก็ยังคงรอคำตอบ',
            isArchived: false,
            displayOrder: 3
        },
        // Choices for Episode 13: บทสรุปของความสัมพันธ์
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep13_choices',
            choiceCode: 'CHOICE_EP13_COMMIT_FAHSAI',
            text: 'เลือกที่จะเริ่มต้นความสัมพันธ์แบบคนรักกับฟ้าใส: "ฟ้าใส...ฉัน...ฉันก็รู้สึกพิเศษกับเธอจริงๆ นะ ฉันอยากให้เราได้อยู่ข้างๆ กันแบบนี้ต่อไป"',
            hoverText: 'ตัดสินใจคบหากับฟ้าใส',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_huge_up_ep13',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 50,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_game_state_set_fahsai_route',
                    type: 'set_game_variable',
                    parameters: {
                        variableName: 'chosen_love_interest',
                        value: 'fah_sai'
                    }
                },
                {
                    actionId: 'action_go_to_node_ep13_path_fahsai_couple',
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_ep13_path_fahsai_couple'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['ความรัก', 'ความผูกพัน', 'ความสุข'],
            psychologicalImpactScore: 9,
            feedbackTextAfterSelection: 'คุณกับฟ้าใสได้เริ่มต้นเส้นทางบทใหม่ด้วยกัน!',
            isArchived: false,
            displayOrder: 1
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep13_choices',
            choiceCode: 'CHOICE_EP13_COMMIT_DIN',
            text: 'เลือกที่จะเริ่มต้นความสัมพันธ์แบบคนรักกับดิน: "ดิน...ฉันอยากอยู่ข้างๆ นาย และเรียนรู้โลกของนายให้มากกว่านี้"',
            hoverText: 'ตัดสินใจคบหากับดิน',
            actions: [
                {
                    actionId: 'action_din_rel_huge_up_ep13',
                    type: 'modify_character_relationship',
                    parameters: {
                        characterCode: 'din',
                        changeValue: 50,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_game_state_set_din_route',
                    type: 'set_game_variable',
                    parameters: {
                        variableName: 'chosen_love_interest',
                        value: 'din'
                    }
                },
                {
                    actionId: 'action_go_to_node_ep13_path_din_couple',
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_ep13_path_din_couple'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['ความรัก', 'ความท้าทาย', 'ความเข้าใจ'],
            psychologicalImpactScore: 9,
            feedbackTextAfterSelection: 'คุณกับดินได้เริ่มต้นเส้นทางบทใหม่ด้วยกัน!',
            isArchived: false,
            displayOrder: 2
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep13_choices',
            choiceCode: 'CHOICE_EP13_FRIENDSHIP_ONLY',
            text: 'เลือกที่จะรักษาความเป็นเพื่อนที่ดีกับทั้งคู่ และยังไม่คบใคร: "ฉันรู้สึกดีกับพวกเธอทั้งคู่มากนะ...แต่ตอนนี้ฉันยังไม่พร้อมที่จะตัดสินใจเรื่องความรัก ฉันอยากให้เรายังคงเป็นเพื่อนที่ดีต่อกันเสมอไปนะ"',
            hoverText: 'ตัดสินใจที่จะเน้นมิตรภาพและค้นหาตัวเองต่อไป',
            actions: [
                {
                    actionId: 'action_game_state_set_friendship_route',
                    type: 'set_game_variable',
                    parameters: {
                        variableName: 'chosen_love_interest',
                        value: 'none'
                    }
                },
                {
                    actionId: 'action_go_to_node_ep13_path_friendship_only',
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'node_ep13_path_friendship_only'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['มิตรภาพ', 'การค้นหาตัวเอง', 'ความเป็นอิสระ'],
            psychologicalImpactScore: 7,
            feedbackTextAfterSelection: 'มิตรภาพกับเพื่อนๆ ยังคงอยู่เสมอ! คุณพร้อมสำหรับชีวิตบทใหม่แล้ว',
            isArchived: false,
            displayOrder: 3
        },
        // Choices for Episode 15: มหาวิทยาลัย...บทใหม่ของชีวิต
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep15_final_choice',
            choiceCode: 'CHOICE_EP15_FOCUS_STUDY',
            text: 'มองไปยังป้ายคณะที่ตนเองกำลังจะเข้าเรียน: "นี่แหละ...จุดเริ่มต้นเส้นทางความฝันของฉัน!"',
            hoverText: 'เน้นการเรียนรู้และเป้าหมายในอนาคต',
            actions: [
                {
                    actionId: 'action_player_stat_add_academics',
                    type: 'modify_player_stat',
                    parameters: {
                        statName: 'academics',
                        changeValue: 10,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_end_season',
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'scene_ep15_end_credit'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['มุ่งมั่น', 'ตั้งใจ', 'ความฝัน'],
            psychologicalImpactScore: 5,
            feedbackTextAfterSelection: 'คุณเต็มเปี่ยมไปด้วยความมุ่งมั่น!',
            isArchived: false,
            displayOrder: 1
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep15_final_choice',
            choiceCode: 'CHOICE_EP15_OPEN_TO_NEW_PEOPLE',
            text: 'มองไปยังกลุ่มนักศึกษาที่ดูเหมือนกำลังหาเพื่อนใหม่: "บางที...ฉันอาจจะได้เจอใครที่น่าสนใจอีกก็ได้นะ"',
            hoverText: 'เปิดใจรับโอกาสและความสัมพันธ์ใหม่ๆ',
            actions: [
                {
                    actionId: 'action_player_stat_add_social',
                    type: 'modify_player_stat',
                    parameters: {
                        statName: 'social_skills',
                        changeValue: 10,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_end_season',
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'scene_ep15_end_credit'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['เปิดใจ', 'อยากรู้อยากเห็น', 'สดใส'],
            psychologicalImpactScore: 5,
            feedbackTextAfterSelection: 'คุณพร้อมที่จะเปิดรับสิ่งใหม่ๆ!',
            isArchived: false,
            displayOrder: 2
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep15_final_choice',
            choiceCode: 'CHOICE_EP15_REFLECT_ON_PAST',
            text: 'มองย้อนกลับไปยังเส้นทางที่ผ่านมาและคิดถึงเพื่อนเก่า: "ฉันจะไม่ลืมเรื่องราวที่แสงอรุณเลย...พวกเธอจะเป็นส่วนหนึ่งของฉันเสมอ"',
            hoverText: 'ให้ความสำคัญกับความทรงจำและมิตรภาพที่ผ่านมา',
            actions: [
                {
                    actionId: 'action_player_stat_add_nostalgia',
                    type: 'modify_player_stat',
                    parameters: {
                        statName: 'nostalgia',
                        changeValue: 10,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_end_season',
                    type: 'go_to_node',
                    parameters: {
                        targetNodeId: 'scene_ep15_end_credit'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['ซาบซึ้ง', 'ความคิดถึง', 'ความผูกพัน'],
            psychologicalImpactScore: 5,
            feedbackTextAfterSelection: 'ความทรงจำที่ผ่านมาจะอยู่กับคุณเสมอ!',
            isArchived: false,
            displayOrder: 3
        }
    ];

    const savedChoices = [];
    for (const choice of choices) {
        const choiceDoc = new ChoiceModel(choice);
        await choiceDoc.save();
        savedChoices.push(choiceDoc);
    }

    return savedChoices;
};