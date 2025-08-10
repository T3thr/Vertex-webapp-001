// src/scripts/create-test-storymap.js
import mongoose from 'mongoose';
import dbConnect from '../backend/lib/mongodb.js';
import NovelModel from '../backend/models/Novel.js';
import StoryMapModel from '../backend/models/StoryMap.js';
import { StoryMapNodeType } from '../backend/models/StoryMap.js';

async function createTestStoryMap() {
  try {
    await dbConnect();
    console.log('Connected to database');

    // Find a novel to attach the story map to
    const novel = await NovelModel.findOne({ isDeleted: { $ne: true } }).lean();
    
    if (!novel) {
      console.error('No novel found in database');
      return;
    }

    console.log(`Found novel: ${novel.title} (ID: ${novel._id})`);

    // Check if story map already exists
    const existingStoryMap = await StoryMapModel.findOne({
      novelId: novel._id,
      isActive: true
    });

    if (existingStoryMap) {
      console.log('Story map already exists, updating it...');
      
      // Update existing story map with test data
      existingStoryMap.nodes = [
        {
          nodeId: 'start_node_1',
          nodeType: StoryMapNodeType.START_NODE,
          title: 'จุดเริ่มต้น',
          position: { x: 100, y: 100 },
          nodeSpecificData: {},
          notesForAuthor: 'จุดเริ่มต้นของเรื่อง'
        },
        {
          nodeId: 'scene_node_1',
          nodeType: StoryMapNodeType.SCENE_NODE,
          title: 'ฉากแรก',
          position: { x: 300, y: 100 },
          nodeSpecificData: { sceneId: 'test_scene_1' },
          notesForAuthor: 'ฉากแรกของเรื่อง'
        },
        {
          nodeId: 'choice_node_1',
          nodeType: StoryMapNodeType.CHOICE_NODE,
          title: 'ตัวเลือกแรก',
          position: { x: 500, y: 100 },
          nodeSpecificData: { choiceIds: ['choice_1', 'choice_2'] },
          notesForAuthor: 'ตัวเลือกแรกที่ผู้เล่นต้องตัดสินใจ'
        },
        {
          nodeId: 'ending_node_1',
          nodeType: StoryMapNodeType.ENDING_NODE,
          title: 'ตอนจบ',
          position: { x: 700, y: 100 },
          nodeSpecificData: { endingTitle: 'ตอนจบแรก' },
          notesForAuthor: 'ตอนจบแรกของเรื่อง'
        }
      ];

      existingStoryMap.edges = [
        {
          edgeId: 'edge_1',
          sourceNodeId: 'start_node_1',
          targetNodeId: 'scene_node_1',
          label: 'เริ่มต้น'
        },
        {
          edgeId: 'edge_2',
          sourceNodeId: 'scene_node_1',
          targetNodeId: 'choice_node_1',
          label: 'ไปยังตัวเลือก'
        },
        {
          edgeId: 'edge_3',
          sourceNodeId: 'choice_node_1',
          targetNodeId: 'ending_node_1',
          label: 'ไปยังตอนจบ'
        }
      ];

      existingStoryMap.storyVariables = [
        {
          variableId: 'var_1',
          variableName: 'player_choice',
          dataType: 'string',
          initialValue: 'none',
          description: 'ตัวเลือกของผู้เล่น',
          isGlobal: true,
          isVisibleToPlayer: false
        }
      ];

      existingStoryMap.version += 1;
      existingStoryMap.updatedAt = new Date();

      await existingStoryMap.save();
      console.log('Updated existing story map successfully');
    } else {
      console.log('Creating new story map...');
      
      // Create new story map
      const newStoryMap = new StoryMapModel({
        novelId: novel._id,
        title: `${novel.title} - Story Map`,
        description: 'Test story map for debugging',
        version: 1,
        nodes: [
          {
            nodeId: 'start_node_1',
            nodeType: StoryMapNodeType.START_NODE,
            title: 'จุดเริ่มต้น',
            position: { x: 100, y: 100 },
            nodeSpecificData: {},
            notesForAuthor: 'จุดเริ่มต้นของเรื่อง'
          },
          {
            nodeId: 'scene_node_1',
            nodeType: StoryMapNodeType.SCENE_NODE,
            title: 'ฉากแรก',
            position: { x: 300, y: 100 },
            nodeSpecificData: { sceneId: 'test_scene_1' },
            notesForAuthor: 'ฉากแรกของเรื่อง'
          },
          {
            nodeId: 'choice_node_1',
            nodeType: StoryMapNodeType.CHOICE_NODE,
            title: 'ตัวเลือกแรก',
            position: { x: 500, y: 100 },
            nodeSpecificData: { choiceIds: ['choice_1', 'choice_2'] },
            notesForAuthor: 'ตัวเลือกแรกที่ผู้เล่นต้องตัดสินใจ'
          },
          {
            nodeId: 'ending_node_1',
            nodeType: StoryMapNodeType.ENDING_NODE,
            title: 'ตอนจบ',
            position: { x: 700, y: 100 },
            nodeSpecificData: { endingTitle: 'ตอนจบแรก' },
            notesForAuthor: 'ตอนจบแรกของเรื่อง'
          }
        ],
        edges: [
          {
            edgeId: 'edge_1',
            sourceNodeId: 'start_node_1',
            targetNodeId: 'scene_node_1',
            label: 'เริ่มต้น'
          },
          {
            edgeId: 'edge_2',
            sourceNodeId: 'scene_node_1',
            targetNodeId: 'choice_node_1',
            label: 'ไปยังตัวเลือก'
          },
          {
            edgeId: 'edge_3',
            sourceNodeId: 'choice_node_1',
            targetNodeId: 'ending_node_1',
            label: 'ไปยังตอนจบ'
          }
        ],
        storyVariables: [
          {
            variableId: 'var_1',
            variableName: 'player_choice',
            dataType: 'string',
            initialValue: 'none',
            description: 'ตัวเลือกของผู้เล่น',
            isGlobal: true,
            isVisibleToPlayer: false
          }
        ],
        startNodeId: 'start_node_1',
        lastModifiedByUserId: novel.author || new mongoose.Types.ObjectId(),
        isActive: true,
        editorMetadata: {
          zoomLevel: 1,
          viewOffsetX: 0,
          viewOffsetY: 0,
          gridSize: 20,
          showGrid: true
        }
      });

      await newStoryMap.save();
      console.log('Created new story map successfully');
    }

    console.log('Test story map creation completed');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test story map:', error);
    process.exit(1);
  }
}

createTestStoryMap();
