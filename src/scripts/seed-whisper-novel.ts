import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel, { NovelStatus, NovelAccessLevel, NovelEndingType, NovelContentType } from '@/backend/models/Novel';
import EpisodeModel, { EpisodeStatus, EpisodeAccessType } from '@/backend/models/Episode';
import SceneModel from '@/backend/models/Scene';
import CharacterModel from '@/backend/models/Character';
import ChoiceModel from '@/backend/models/Choice';
import UserModel from '@/backend/models/User';
import UserProfileModel from '@/backend/models/UserProfile';
import CategoryModel, { CategoryType } from '@/backend/models/Category';

config({ path: '.env' });

const AUTHOR_USERNAME = 'whisper_author';
const NOVEL_SLUG = 'เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999';
const NOVEL_TITLE = 'เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999';

// --- DATA DEFINITIONS ---

const characterData = [
  {
    characterCode: 'nira',
    name: 'นิรา',
    description: 'หญิงสาวที่เพิ่งย้ายเข้ามาในบ้านหลังใหม่ที่เต็มไปด้วยความลับและความน่าสะพรึงกลัว',
    expressions: [
      { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
      { expressionId: 'scared', name: 'หวาดกลัว', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
      { expressionId: 'curious', name: 'สงสัย', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
    ],
    defaultExpressionId: 'normal',
  },
  {
    characterCode: 'agent',
    name: 'นายหน้า',
    description: 'นายหน้าที่ดูมีลับลมคมใน ผู้ขายบ้านให้กับนิรา',
    expressions: [{ expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }],
    defaultExpressionId: 'normal',
  },
];

const choiceData = [
  // Major Choices
  { choiceCode: 'CHOICE_EXPLORE', text: 'เดินสำรวจบ้านชั้นล่างทันที', actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_explore_downstairs_1' } }], isMajorChoice: true },
  { choiceCode: 'CHOICE_CLEAN', text: 'ทำความสะอาดห้องนั่งเล่นและเปิดผ้าม่าน', actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_end_of_prologue' } }], isMajorChoice: true },
  { choiceCode: 'CHOICE_CALL', text: 'โทรหาเพื่อนเพื่อเล่าเรื่องบ้านใหม่', actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_end_of_prologue' } }], isMajorChoice: true },
  
  // Path 1.1 choices
  { choiceCode: 'CHOICE_LISTEN_NOW', text: 'กดฟังเทปทันที', actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_listen_tape_1' } }], isMajorChoice: false },
  { choiceCode: 'CHOICE_LISTEN_LATER', text: 'รอให้ถึงตีสาม แล้วฟังตามที่เขียน', actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_end_of_prologue' } }], isMajorChoice: false },
  { choiceCode: 'CHOICE_BURN_TAPE', text: 'เผาเทปทิ้งทันที', actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_end_of_prologue' } }], isMajorChoice: false },

  // Path 1.1.1 choices
  { choiceCode: 'CHOICE_OPEN_SECRET_DOOR', text: 'เปิดประตูลับและลงไปทันที', actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_enter_basement_1' } }], isMajorChoice: false },
  { choiceCode: 'CHOICE_TAKE_PHOTO', text: 'ถ่ายรูปส่งให้เพื่อนก่อนเปิด', actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_send_photo_1' } }], isMajorChoice: false },
  { choiceCode: 'CHOICE_LOCK_DOOR', text: 'ปิดมันไว้แล้วล็อกด้วยตู้เย็นทับ', actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_lock_door_1' } }], isMajorChoice: false },

  // Path 1.1.1.3 Choices
  { choiceCode: 'CHOICE_REINFORCE_DOOR', text: 'เสริมโครงไม้ทับตู้เย็นอีกชั้น', actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_reinforce_door_1' } }], isMajorChoice: false },
  { choiceCode: 'CHOICE_SETUP_CAMERA', text: 'ตั้งกล้องวงจรปิดไว้หน้าตู้เย็น แล้วออกไปนอนข้างนอกสักคืน', actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_setup_camera_1' } }], isMajorChoice: false },
  { choiceCode: 'CHOICE_DESTROY_DOOR', text: 'หาวัสดุระเบิดฝังตรงนั้นแล้วเผาทำลายให้หมด', actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_destroy_door_1' } }], isMajorChoice: false },
];

const sceneData = [
    // Intro
    { sceneOrder: 1, nodeId: 'scene_arrival', title: 'การมาถึง', background: { type: 'image', value: '/images/background/ChurchCorridor_Sunset.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_1', type: 'narration', content: 'เสียงล้อกระเป๋าเดินทางบดไปบนพื้นซีเมนต์หน้าบ้านเลขที่ 9 — บ้านเก่าทรงโคโลเนียลสองชั้น หลังคางุ้มด้วยเถาวัลย์ที่เริ่มแห้งเฉา ข้างในมืดสนิทแม้จะเป็นเวลาเย็น เพราะไม่มีใครอยู่มานานหลายปี' }], defaultNextNodeId: 'scene_key_exchange' },
    { sceneOrder: 2, nodeId: 'scene_key_exchange', title: 'รับกุญแจ', background: { type: 'image', value: '/images/background/door.png', isOfficialMedia: true, fitMode: 'cover' }, characters: [{ characterCode: 'agent', expressionId: 'normal', instanceId: 'agent_char' }, { characterCode: 'nira', expressionId: 'normal', instanceId: 'nira_char' }], textContents: [{ instanceId: 'dialogue_agent', type: 'dialogue', characterInstanceId: 'agent_char', content: '“ยินดีต้อนรับ คุณนิรา” — เสียงของนายหน้าอสังหาริมทรัพย์กล่าว พร้อมยื่นกุญแจบ้านให้' }], defaultNextNodeId: 'scene_nira_thoughts' },
    { sceneOrder: 3, nodeId: 'scene_nira_thoughts', title: 'ความคิดของนิรา', background: { type: 'image', value: '/images/background/door.png', isOfficialMedia: true, fitMode: 'cover' }, characters: [{ characterCode: 'nira', expressionId: 'curious', instanceId: 'nira_char_thinking' }], textContents: [{ instanceId: 'dialogue_nira_internal', type: 'dialogue', characterInstanceId: 'nira_char_thinking', content: '“บ้านนี้ราคาถูกจนน่าตกใจ แต่สวยดี” นิราพึมพำกับตัวเอง' }], defaultNextNodeId: 'scene_agent_warning' },
    { sceneOrder: 4, nodeId: 'scene_agent_warning', title: 'คำเตือน', background: { type: 'image', value: '/images/background/door.png', isOfficialMedia: true, fitMode: 'cover' }, characters: [{ characterCode: 'agent', expressionId: 'normal', instanceId: 'agent_char_leaving' }], textContents: [{ instanceId: 'dialogue_agent_whisper', type: 'narration', content: '“เพราะมีข่าวลือ…” นายหน้ากระซิบเบาๆ แล้วรีบหันหลังจากไป' }], defaultNextNodeId: 'scene_enter_house' },
    { sceneOrder: 5, nodeId: 'scene_enter_house', title: 'เข้าบ้าน', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_enter', type: 'narration', content: 'คุณเดินเข้าบ้านพร้อมกระเป๋าเพียงหนึ่งใบ แสงแดดสุดท้ายลอดผ่านหน้าต่างที่เต็มไปด้วยฝุ่น ก่อนจะดับวูบ...' }], defaultNextNodeId: 'scene_first_choice' },
    { sceneOrder: 6, nodeId: 'scene_first_choice', title: 'การตัดสินใจแรก', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_4', type: 'narration', content: 'ตอนนี้คุณจะทำอะไรเป็นอย่างแรก?' }], choiceCodes: ['CHOICE_EXPLORE', 'CHOICE_CLEAN', 'CHOICE_CALL'] },
    
    // Path 1.1: Explore -> Find Tape
    { sceneOrder: 7, nodeId: 'scene_explore_downstairs_1', title: 'สำรวจชั้นล่าง', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_explore_1', type: 'narration', content: 'เธอเปิดไฟและเดินสำรวจรอบบ้าน พบว่าห้องทุกห้องดูเก่าแต่ไม่มีร่องรอยการอยู่' }], defaultNextNodeId: 'scene_found_box' },
    { sceneOrder: 8, nodeId: 'scene_found_box', title: 'กล่องไม้เก่า', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_found_box', type: 'narration', content: 'ขณะเดินผ่านห้องใต้บันได เธอสังเกตเห็น “กล่องไม้เก่า” มีตราประทับปี 1974' }], defaultNextNodeId: 'scene_found_tape' },
    { sceneOrder: 9, nodeId: 'scene_found_tape', title: 'เทปลึกลับ', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_found_tape', type: 'narration', content: 'ข้างในมีเครื่องเล่นเทปพกพาและคาสเซ็ตที่เขียนด้วยลายมือว่า “เสียงสุดท้ายของฉัน - ห้ามฟังตอนตีสาม”' }], defaultNextNodeId: 'scene_tape_choice' },
    { sceneOrder: 10, nodeId: 'scene_tape_choice', title: 'การตัดสินใจกับเทป', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, choiceCodes: ['CHOICE_LISTEN_NOW', 'CHOICE_LISTEN_LATER', 'CHOICE_BURN_TAPE'] },

    // Path 1.1.1: Listen Now -> Find Secret Door
    { sceneOrder: 11, nodeId: 'scene_listen_tape_1', title: 'เสียงจากเทป', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_tape_sound', type: 'narration', content: 'เสียงแทรกซ่าก่อนจะค่อยๆ ชัดขึ้น…' }, { instanceId: 'narration_tape_voice', type: 'narration', content: '“ฉันเห็นผู้ชายไม่มีหน้าในกระจก…เขาบอกให้ฉัน ‘ตามหาเสียงกระซิบในห้องใต้ดิน’…แต่บ้านนี้ไม่มีห้องใต้ดิน…”' }], defaultNextNodeId: 'scene_secret_door'},
    { sceneOrder: 12, nodeId: 'scene_secret_door', title: 'ประตูลับ', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_nira_shock', type: 'narration', content: 'นิราตกใจ ปิดเทป' }, { instanceId: 'narration_found_door', type: 'narration', content: 'วันรุ่งขึ้น เธอสังเกตเห็นพรมในครัวนูนขึ้นเล็กน้อย เมื่อเปิดออกมา พบ “ประตูลับ”' }], defaultNextNodeId: 'scene_secret_door_choice' },
    { sceneOrder: 13, nodeId: 'scene_secret_door_choice', title: 'การตัดสินใจกับประตูลับ', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, choiceCodes: ['CHOICE_OPEN_SECRET_DOOR', 'CHOICE_TAKE_PHOTO', 'CHOICE_LOCK_DOOR'] },

    // Path 1.1.1.1: Open Door -> Bad Ending 1
    { sceneOrder: 14, nodeId: 'scene_enter_basement_1', title: 'ห้องใต้ดิน', background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_basement_whisper', type: 'narration', content: 'เสียงกระซิบดังขึ้นทันทีที่เปิดประตู… “ดีใจที่เธอมาจนถึงตรงนี้…”'}], defaultNextNodeId: 'scene_basement_encounter' },
    { sceneOrder: 15, nodeId: 'scene_basement_encounter', title: 'เผชิญหน้า', background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_basement_details', type: 'narration', content: 'ข้างล่างเป็นห้องใต้ดินเก่ามืดสนิท มีผนังที่ขูดด้วยเล็บนับพันเส้น ตรงกลางห้อง มีผู้ชายไม่มีหน้า…ยื่นกล่องไม้กลับมาให้เธอ…' }], defaultNextNodeId: 'scene_bad_ending_1' },
    { sceneOrder: 16, nodeId: 'scene_bad_ending_1', title: 'เสียงสุดท้าย', background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_final_words', type: 'narration', content: '“ต่อไป…เสียงสุดท้ายจะเป็นของเธอ”'}, { instanceId: 'narration_ending_desc', type: 'narration', content: 'นิราหายไป อีกสองเดือนต่อมา กล่องไม้และเทปอันเดิมกลับไปวางอยู่ที่เดิม พร้อมเทปล่าสุดว่า “เสียงของนิรา”' }] },

    // Path 1.1.1.2: Take Photo -> Bad Ending 2
    { sceneOrder: 17, nodeId: 'scene_send_photo_1', title: 'คำเตือนจากเพื่อน', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_friend_warning', type: 'narration', content: 'มิน เพื่อนสนิท รีบบอกให้เธอ “อย่าเปิดเด็ดขาด!”' }, { instanceId: 'narration_kitchen_door_opens', type: 'narration', content: 'นิรากำลังจะปิดฝากลับไป… แต่ประตูห้องครัวก็ เปิดเอง…' }], defaultNextNodeId: 'scene_other_doors' },
    { sceneOrder: 18, nodeId: 'scene_other_doors', title: 'ประตูบานอื่น', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_whisper_choice', type: 'narration', content: 'เสียงกระซิบดังขึ้น: “ถ้าไม่เปิดประตูนั้น ประตูอื่นจะเปิดแทน…”' }, { instanceId: 'narration_chaos', type: 'narration', content: 'ทันใดนั้น…หน้าต่างทุกบานเปิดพรึ่บ ไฟดับทั้งหลัง…' }], defaultNextNodeId: 'scene_bad_ending_2' },
    { sceneOrder: 19, nodeId: 'scene_bad_ending_2', title: 'เสียงที่ถูกเลือก', background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_disappearance', type: 'narration', content: 'นิราหายไปกลางสายตาของมินผ่านวิดีโอคอล กล้องดับพร้อมเสียงกระซิบว่า “เสียงของเธอ…ถูกเลือกแล้ว”' }] },

    // Path 1.1.1.3: Lock Door -> Choice
    { sceneOrder: 20, nodeId: 'scene_lock_door_1', title: 'ผนึกประตู', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_shaking', type: 'narration', content: 'นิราตัวสั่น มือไม้เย็นเฉียบ สิ่งที่เธอเพิ่งเห็นใต้ประตูลับ — เงาคล้ายร่างเด็กผอมสูงที่เคลื่อนไหวเร็วผิดธรรมชาติ — มันยังคงลอยอยู่ในดวงตาเธอ' }, { instanceId: 'narration_slam_door', type: 'narration', content: 'เธอ กระแทก ฝาปิดบันไดใต้พื้นด้วยแรงทั้งหมดที่มี เสียง “ปึง!” ดังขึ้น และตามด้วยเสียงกระแทกเบา ๆ …จาก “ข้างใต้”' }, { instanceId: 'narration_climbing', type: 'narration', content: 'กึก… กึก… ตึง… เหมือนบางอย่างกำลังปีนขึ้นมา' }, { instanceId: 'narration_move_fridge', type: 'narration', content: 'นิรารีบลากตู้เย็นขนาดใหญ่ไปทับไว้ทันที ต้องใช้แรงมากกว่าที่เคยใช้มาในชีวิต กล้ามเนื้อสั่นระริกเมื่อเธอลากขอบมันผ่านพื้นไม้เก่าเสียงครูด ๆ อย่างน่าขนลุก' }, { instanceId: 'narration_lock_fridge', type: 'narration', content: 'ในที่สุด… ตู้เย็นก็ขวางไว้ตรงกลางพอดี เธอรีบเอาโซ่ที่เคยใช้รัดประตูคลังอาหาร มารัดไว้กับหูเหล็กของตู้เย็น และตรึงกับตะขอบนพื้น ล็อกไว้แล้ว' }, { instanceId: 'narration_hope', type: 'narration', content: 'สิ่งที่อยู่ข้างล่าง…จะไม่มีวันขึ้นมาอีก หรืออย่างน้อย…เธอก็หวังเช่นนั้น' }], defaultNextNodeId: 'scene_vigil' },
    { sceneOrder: 21, nodeId: 'scene_vigil', title: 'เฝ้าระวัง', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_vigil', type: 'narration', content: 'คืนนั้น เธอนั่งเฝ้าตู้เย็นทั้งคืน โดยถือมีดครัวไว้ในมือ เสียงเคาะยังคงมีเป็นระยะ…' }, { instanceId: 'narration_knocking', type: 'narration', content: 'ไม่แรง…แต่สม่ำเสมอ เหมือน “มันรู้” ว่าเธอยังนั่งฟังอยู่ เหมือนการย้ำเตือนว่า “ฉันยังอยู่ตรงนี้”' }], defaultNextNodeId: 'scene_lock_door_choice' },
    { sceneOrder: 22, nodeId: 'scene_lock_door_choice', title: 'ทางเลือกต่อไป', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, choiceCodes: ['CHOICE_REINFORCE_DOOR', 'CHOICE_SETUP_CAMERA', 'CHOICE_DESTROY_DOOR'] },

    // Path 1.1.1.3.1: Reinforce -> Bad Ending 3
    { sceneOrder: 23, nodeId: 'scene_reinforce_door_1', title: 'เสริมความแข็งแกร่ง', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_reinforce', type: 'narration', content: 'นิราใช้เวลาทั้งเช้า เลื่อยไม้จากลังเก่า ตอกโครงเหล็กกับผนังสองด้านของห้องครัว เธอเอาไม้หนา ๆ ทับบนตู้เย็น ตอกตะปูแน่นทุกมุม จนกลายเป็น “หลุมฝังศพ” ที่ไม่มีวันเปิดอีก' }, { instanceId: 'narration_whisper_plug', type: 'narration', content: 'เสียงเคาะเงียบลงในคืนที่สาม แต่สิ่งที่ดังแทนคือ… เสียง “กระซิบจากปลั๊กไฟ” เมื่อเธอเอาหูแนบผนัง กลับได้ยินเสียงเด็กพูดคำว่า… “เธอฝังฉัน… แต่ฉันฝันถึงเธอทุกคืน…”' }], defaultNextNodeId: 'scene_bad_ending_3' },
    { sceneOrder: 24, nodeId: 'scene_bad_ending_3', title: 'มืออีกข้าง', background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_sleepwalk', type: 'narration', content: 'นิราเริ่มละเมอ เธอลุกขึ้นกลางดึก เดินมาที่ห้องครัว และ… แกะตะปูออกทีละตัว… ทั้งที่หลับตาอยู่' }, { instanceId: 'narration_other_hand', type: 'narration', content: 'กล้องวงจรปิดที่เธอลืมไว้ในมุมห้องจับภาพได้ชัดเจน ว่า “มือที่เปิดไม้แผ่นสุดท้าย” ไม่ใช่มือเธอคนเดียว… มี “อีกมือ” ที่ผิวซีดขาว…จับตะปูอีกด้าน พร้อมกัน' }] },

    // Path 1.1.1.3.2: Setup Camera -> Bad Ending 4
    { sceneOrder: 25, nodeId: 'scene_setup_camera_1', title: 'ติดตั้งกล้อง', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_setup_camera', type: 'narration', content: 'นิราซื้อกล้องวงจรปิดแบบมีอินฟราเรดมาติดไว้ หันตรงไปยังตู้เย็นกับพื้น เธอออกไปนอนโรงแรมเล็ก ๆ ในตัวเมือง พร้อมโน้ตบุ๊กเพื่อดูฟุตเทจแบบเรียลไทม์' }, { instanceId: 'narration_camera_shake', type: 'narration', content: 'ตีสองสิบห้า — จู่ ๆ กล้องเริ่มสั่น ในภาพปรากฏ “ร่างดำซีดสูงเกินคน” ปีนออกจากช่องแคบ ๆ ใต้ตู้เย็น แม้ตู้เย็นไม่ขยับเลยสักนิด' }, { instanceId: 'narration_faceless', type: 'narration', content: 'มัน ทะลุผ่าน อย่างไร้แรงต้าน มันยืนนิ่ง…แล้ว “หันหน้ามาทางกล้องโดยตรง” ใบหน้าขาวซีดไม่มีลูกตา แต่กลับมี “ปาก” อยู่ตรงกลางหน้าผาก ปากนั้น… ยิ้ม' }], defaultNextNodeId: 'scene_bad_ending_4' },
    { sceneOrder: 26, nodeId: 'scene_bad_ending_4', title: 'ถึงตาเธอ', background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_camera_destroyed', type: 'narration', content: 'นิรากลับบ้านในวันรุ่งขึ้น กล้องถูกบิดหักพังลง หน้าประตูบ้านมีโน้ตเขียนด้วยลายมือเด็ก: “ออกไปได้แล้ว… ถึงตาเธอลงมาหาฉันบ้าง”' }] },

    // Path 1.1.1.3.3: Destroy -> Bad Ending 5
    { sceneOrder: 27, nodeId: 'scene_destroy_door_1', title: 'ทำลายล้าง', background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_destroy_plan', type: 'narration', content: 'นิราตัดสินใจว่า จะไม่ทนอีกต่อไป เธอรู้จักเพื่อนเก่าที่เป็นช่างโยธา เขาช่วยเอาวัตถุระเบิดแรงต่ำมาฝังไว้ใต้พื้นห้อง เธอเตือนเพื่อนว่า “อย่ามองเข้าไปข้างในเด็ดขาด”' }, { instanceId: 'narration_explosion', type: 'narration', content: 'เวลา 05:03 น. นิรากดสวิตช์จุดระเบิดในระยะไกล ตูม! เสียงดังสะท้อนทั่วหมู่บ้าน ไฟไหม้ลุกลามเฉพาะ “บริเวณห้องครัว”' }, { instanceId: 'narration_shadow', type: 'narration', content: 'เธอเห็นเงาดำ ๆ พุ่งขึ้นไปในเปลวเพลิง เหมือนกำลังดิ้น…และ “หัวเราะ”' }], defaultNextNodeId: 'scene_bad_ending_5' },
    { sceneOrder: 28, nodeId: 'scene_bad_ending_5', title: 'รอยยิ้มสุดท้าย', background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_no_basement', type: 'narration', content: 'เจ้าหน้าที่ดับเพลิงพบว่า ใต้บ้านไม่มีทางเดิน ไม่มีห้องใต้ดิน ไม่มีอุโมงค์ใด ๆ ทั้งสิ้น “มันแค่ดินตัน ๆ… ไม่มีช่องเลยครับ”' }, { instanceId: 'narration_camera_reveal', type: 'narration', content: 'แต่…ในภาพจากกล้องเพื่อนช่าง ก่อนระเบิดจะลง 3 วินาที มีเด็กหญิงตัวเล็ก ๆ เดินขึ้นจากช่องพื้น หันหน้ามา… แล้วยิ้มให้กล้อง…' }] },

    // Fallback Ending
    { sceneOrder: 29, nodeId: 'scene_end_of_prologue', title: 'จะเกิดอะไรขึ้นต่อไป...', background: { type: 'image', value: '/images/background/main.png', isOfficialMedia: true, fitMode: 'cover' }, textContents: [{ instanceId: 'narration_ending', type: 'narration', content: 'เรื่องราวในบทแรกจบลงเพียงเท่านี้... การตัดสินใจของคุณจะนำไปสู่อะไร โปรดติดตามตอนต่อไป' }] }
];


// --- SEEDING LOGIC ---

const findOrCreateCategory = async (name: string, type: CategoryType, slug: string) => {
    // Check for existing category by slug and type (most reliable)
    let category = await CategoryModel.findOne({ slug, categoryType: type });
    
    // If not found by slug, check by name and type (fallback)
    if (!category) {
        category = await CategoryModel.findOne({ name, categoryType: type });
    }
    
    if (!category) {
        console.log(`- Creating new category: "${name}"`);
        category = await CategoryModel.create({
            name,
            slug,
            categoryType: type,
            description: `Category for ${name}`,
            isSystemDefined: true,
        });
    } else {
        console.log(`- Using existing category: "${category.name}" (Type: ${category.categoryType}, ID: ${category._id})`);
    }
    return category._id;
};

const seedWhisperNovel = async () => {
  try {
    await dbConnect();
        console.log('✅ Database connection successful.');

        // --- 1. Cleanup ---
        console.log(`🧹 Cleaning up old data for novel: "${NOVEL_TITLE}"...`);
        const novel = await NovelModel.findOne({ slug: NOVEL_SLUG });
        if (novel) {
            await Promise.all([
                EpisodeModel.deleteMany({ novelId: novel._id }),
                SceneModel.deleteMany({ novelId: novel._id }),
                ChoiceModel.deleteMany({ novelId: novel._id }),
                CharacterModel.deleteMany({ novelId: novel._id }),
            ]);
            await NovelModel.deleteOne({ _id: novel._id });
            console.log('✅ Old data cleaned up.');
        } else {
            console.log('🧐 No old novel data found, skipping cleanup.');
        }
        
        // Ensure character unique index is ready
        await CharacterModel.syncIndexes();

        // --- 2. Create Author ---
        console.log(`👤 Finding or creating author: "${AUTHOR_USERNAME}"...`);
        let author = await UserModel.findOne({ username: AUTHOR_USERNAME });
    if (!author) {
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash('password123', salt);
            author = await UserModel.create({
                username: AUTHOR_USERNAME,
                email: 'author_whisper@novelmaze.com',
                password: hashedPassword,
                roles: ['Writer'],
                primaryPenName: 'นักเขียนเงา',
                isEmailVerified: true,
                accounts: [{ provider: 'credentials', providerAccountId: 'author_whisper@novelmaze.com', type: 'credentials' }],
            });
            const authorProfile = await UserProfileModel.create({
                userId: author._id,
                displayName: 'นักเขียนเงา',
                penNames: ['ผู้เขียนเสียงกระซิบ'],
                bio: 'ผู้สร้างสรรค์เรื่องราวสยองขวัญ',
            });
            author.profile = authorProfile._id;
            await author.save();
            console.log(`✅ Author created: ${author.username}`);
        } else {
            console.log(`✅ Author found: ${author.username}`);
        }

        // --- 3. Create Categories ---
        console.log('📚 Creating categories...');
        const langCatId = await findOrCreateCategory('ภาษาไทย', CategoryType.LANGUAGE, 'th');
        const themeCatId = await findOrCreateCategory('สยองขวัญ', CategoryType.GENRE, 'horror');
        console.log('✅ Categories created.');

        // --- 4. Create Novel ---
        console.log(`📖 Creating novel: "${NOVEL_TITLE}"...`);
        const newNovel = await NovelModel.create({
        title: NOVEL_TITLE,
            slug: NOVEL_SLUG,
        author: author._id,
            synopsis: 'เมื่อการย้ายบ้านใหม่นำไปสู่การค้นพบเทปลึกลับ ชะตากรรมของนิราจึงอยู่ในมือคุณ',
        coverImageUrl: '/images/thriller/thriller1.jpg',
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PUBLIC,
        endingType: NovelEndingType.MULTIPLE_ENDINGS,
        sourceType: { type: NovelContentType.INTERACTIVE_FICTION },
            language: langCatId,
            themeAssignment: { mainTheme: { categoryId: themeCatId } },
        isFeatured: true,
            publishedAt: new Date(),
        });
        console.log(`✅ Novel created with ID: ${newNovel._id}`);

        // --- 5. Create Episode ---
        const newEpisode = await EpisodeModel.create({
            novelId: newNovel._id,
            authorId: author._id,
            title: 'บทที่ 1: ย้ายเข้า',
            slug: 'บทที่-1-ย้ายเข้า',
            episodeOrder: 1,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.PAID_UNLOCK,
            priceCoins: 10,
            publishedAt: new Date(),
        });

        // --- 6. Create Characters, Choices, Scenes ---
    console.log('👥 Creating characters...');
        const characterDocs = await CharacterModel.insertMany(
            characterData.map(c => ({ ...c, novelId: newNovel._id, authorId: author._id }))
        );
        const characterMap = new Map(characterDocs.map(c => [c.characterCode, c._id]));
        console.log(`✅ ${characterDocs.length} characters created.`);

        console.log('🔀 Creating choices...');
        const choiceDocs = await ChoiceModel.insertMany(
            choiceData.map(c => ({ ...c, novelId: newNovel._id, authorId: author._id }))
        );
        const choiceMap = new Map(choiceDocs.map(c => [c.choiceCode, c._id]));
        console.log(`✅ ${choiceDocs.length} choices created.`);

    console.log('🎬 Creating scenes...');
        const scenePayloads = sceneData.map(s => ({
            ...s,
            novelId: newNovel._id,
            episodeId: newEpisode._id,
            choiceIds: s.choiceCodes?.map(code => choiceMap.get(code)).filter(id => id) || [],
            characters: s.characters?.map(char => ({
                ...char,
                characterId: characterMap.get(char.characterCode),
            })) || [],
            textContents: s.textContents?.map(tc => {
                if (tc.type === 'dialogue' && 'characterCode' in tc) {
                    const charInstance = s.characters?.find(c => c.characterCode === (tc as any).characterCode);
                    return {...tc, characterInstanceId: charInstance?.instanceId };
                }
                return tc;
            })
        }));

        const sceneDocs = await SceneModel.insertMany(scenePayloads);
        const sceneNodeMap = new Map(sceneDocs.map((s, i) => [sceneData[i].nodeId, s._id]));
        console.log(`✅ ${sceneDocs.length} scenes created.`);

        // --- 7. Link Scenes ---
        console.log('🔗 Linking scenes...');
        for (const sceneDoc of sceneDocs) {
            const sceneDef = sceneData.find(s => s.nodeId === sceneDoc.nodeId);
            if (sceneDef?.defaultNextNodeId) {
                const nextSceneId = sceneNodeMap.get(sceneDef.defaultNextNodeId);
                if (nextSceneId) {
                    await SceneModel.findByIdAndUpdate(sceneDoc._id, { defaultNextSceneId: nextSceneId });
                }
            }
        }
        console.log('✅ Scenes linked successfully.');

        // --- 8. Finalize Episode ---
        await EpisodeModel.findByIdAndUpdate(newEpisode._id, {
            firstSceneId: sceneNodeMap.get('scene_arrival'),
            sceneIds: sceneDocs.map(s => s._id),
        });

        console.log('🎉 Seeding completed successfully!');
  } catch (error) {
        console.error('❌ An error occurred during the seeding process:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🚪 Database connection closed.');
    }
};

seedWhisperNovel();

