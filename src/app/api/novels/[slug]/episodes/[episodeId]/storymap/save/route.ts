// src/app/api/novels/[slug]/episodes/[episodeId]/storymap/save/route.ts
// 🎯 Episode-specific StoryMap Save API
// Professional-grade save endpoint for episode-specific content

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import StoryMapModel from '@/backend/models/StoryMap';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { Types } from 'mongoose';

interface SaveStoryMapRequest {
  nodes: any[];
  edges: any[];
  storyVariables: any[];
  version?: number;
}

// 📝 POST /api/novels/[slug]/episodes/[episodeId]/storymap/save
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    const { slug, episodeId } = await params;
    console.log(`[Episode StoryMap Save API] 🎯 Saving StoryMap for episode: ${episodeId}`);
    
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // ตรวจสอบ Novel และสิทธิ์
    const novel = await NovelModel.findOne({ 
      slug,
      isDeleted: { $ne: true }
    }).select('_id author coAuthors title');

    if (!novel) {
      return NextResponse.json({ 
        success: false, 
        error: 'Novel not found' 
      }, { status: 404 });
    }

    const userId = new Types.ObjectId(session.user.id);
    const isAuthor = novel.author.toString() === userId.toString();
    const isCoAuthor = novel.coAuthors?.some((coAuthor: any) => 
      coAuthor.userId?.toString() === userId.toString()
    );

    if (!isAuthor && !isCoAuthor) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied' 
      }, { status: 403 });
    }

    // ตรวจสอบ Episode - รองรับทั้ง string และ ObjectId format
    console.log(`[Episode StoryMap Save API] 🔍 Looking for episode:`, {
      episodeId,
      episodeIdType: typeof episodeId,
      episodeIdLength: episodeId?.length,
      novelId: novel._id.toString(),
      isValidObjectId: Types.ObjectId.isValid(episodeId)
    });

    // 🔥 CRITICAL FIX: ตรวจสอบว่า episodeId เป็น valid ObjectId ก่อน
    if (!Types.ObjectId.isValid(episodeId)) {
      console.error(`[Episode StoryMap Save API] ❌ Invalid Episode ID format:`, episodeId);
      return NextResponse.json({ 
        success: false, 
        error: `รหัสตอนไม่ถูกต้อง (Invalid Episode ID format: ${episodeId})` 
      }, { status: 400 });
    }

    const episode = await EpisodeModel.findOne({
      _id: new Types.ObjectId(episodeId),
      novelId: novel._id
    }).select('_id title episodeOrder status');

    if (!episode) {
      console.error(`[Episode StoryMap Save API] ❌ Episode not found:`, {
        episodeId,
        novelId: novel._id.toString(),
        novelTitle: novel.title
      });
      
      // 🔍 DEBUG: ตรวจสอบว่ามี episodes อะไรบ้างในนิยายนี้
      const allEpisodes = await EpisodeModel.find({ novelId: novel._id })
        .select('_id title episodeOrder')
        .limit(10)
        .lean();
      
      console.log(`[Episode StoryMap Save API] 📋 Available episodes for this novel:`, 
        allEpisodes.map(ep => ({ 
          id: ep._id.toString(), 
          title: ep.title, 
          order: ep.episodeOrder 
        }))
      );
      
      return NextResponse.json({ 
        success: false, 
        error: `ไม่พบตอนที่เลือก (ID: ${episodeId}). กรุณา refresh หน้าเว็บหรือเลือกตอนใหม่`,
        details: {
          episodeId,
          novelId: novel._id.toString(),
          availableEpisodes: allEpisodes.map(ep => ({
            id: ep._id.toString(),
            title: ep.title
          }))
        }
      }, { status: 404 });
    }

    console.log(`[Episode StoryMap Save API] ✅ Episode found:`, {
      episodeId: episode._id.toString(),
      title: episode.title,
      order: episode.episodeOrder,
      status: episode.status
    });

    // Parse request body
    const body: SaveStoryMapRequest = await request.json();
    const { nodes = [], edges = [], storyVariables = [], version } = body;

    console.log(`[Episode StoryMap Save API] 📊 Received data:`, {
      episodeId,
      episodeTitle: episode.title,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      variableCount: storyVariables.length,
      requestedVersion: version
    });

    // 🔥 CRITICAL: ทำความสะอาดและตรวจสอบ storyVariables - PROFESSIONAL GRADE
    const usedVariableIds = new Set<string>();
    const usedVariableNames = new Set<string>();
    const timestamp = Date.now();
    const sessionId = Math.random().toString(36).substr(2, 12);

    console.log(`[Episode StoryMap Save API] 🧹 Starting variable cleaning:`, {
      originalCount: storyVariables.length,
      rawVariables: storyVariables.map((v, i) => ({
        index: i,
        id: v?.variableId,
        name: v?.variableName || v?.name,
        type: typeof v?.variableId
      }))
    });

    const cleanedStoryVariables = storyVariables
      .filter((variable, index) => {
        // 🔥 STEP 1: Filter out completely invalid variables
        if (!variable) {
          console.warn(`[Episode StoryMap Save] 🚨 Filtered null/undefined variable at index ${index}`);
          return false;
        }
        
        if (!variable.variableName && !variable.name) {
          console.warn(`[Episode StoryMap Save] 🚨 Filtered variable without name at index ${index}:`, variable);
          return false;
        }
        
        // 🔥 CRITICAL: Filter out variables with null/undefined/empty/invalid IDs
        const rawId = variable.variableId;
        if (rawId === null || rawId === undefined) {
          console.warn(`[Episode StoryMap Save] 🚨 Filtered variable with null/undefined ID at index ${index}:`, {
            id: rawId,
            name: variable.variableName || variable.name
          });
          return false;
        }
        
        const idString = String(rawId).trim();
        if (!idString || idString === 'null' || idString === 'undefined' || idString === 'NaN' || idString === '') {
          console.warn(`[Episode StoryMap Save] 🚨 Filtered variable with invalid ID string at index ${index}:`, {
            id: rawId,
            idString,
            name: variable.variableName || variable.name
          });
          return false;
        }
        
        return true;
      })
      .map((variable, index) => {
        // 🔥 STEP 2: Clean and deduplicate valid variables
        const rawId = variable.variableId;
        let uniqueId = String(rawId).trim();
        let uniqueName = String(variable.variableName || variable.name || `Variable_${index + 1}`).trim();

        // 🔥 CRITICAL: Detect and fix duplicate IDs
        if (usedVariableIds.has(uniqueId)) {
          const randomSuffix = Math.random().toString(36).substr(2, 9);
          uniqueId = `var_${timestamp}_${sessionId}_${index}_${randomSuffix}`;
          console.warn(`[Episode StoryMap Save] ⚠️ Duplicate variableId detected, regenerated: ${uniqueId}`);
        }
        usedVariableIds.add(uniqueId);

        // 🔥 ENHANCED: Detect and fix duplicate variable names
        if (usedVariableNames.has(uniqueName)) {
          let counter = 2;
          let newName = `${uniqueName}_${counter}`;
          while (usedVariableNames.has(newName)) {
            counter++;
            newName = `${uniqueName}_${counter}`;
          }
          uniqueName = newName;
          console.warn(`[Episode StoryMap Save] ⚠️ Duplicate variableName detected, renamed to: ${uniqueName}`);
        }
        usedVariableNames.add(uniqueName);

        return {
          variableId: uniqueId,
          variableName: uniqueName,
          dataType: variable.dataType || variable.variableType || 'string',
          initialValue: variable.initialValue !== undefined ? variable.initialValue : '',
          description: variable.description || '',
          isGlobal: variable.isGlobal !== undefined ? variable.isGlobal : false,
          isVisibleToPlayer: variable.isVisibleToPlayer || false
        };
      })
      // 🔥 STEP 3: Final validation - ensure absolutely NO null/undefined/empty IDs
      .filter((variable, index) => {
        if (!variable.variableId || variable.variableId === null || variable.variableId === 'null' || variable.variableId === 'undefined' || variable.variableId.trim() === '') {
          console.error(`[Episode StoryMap Save] 🚨 CRITICAL: Removing variable with invalid ID after mapping:`, variable);
          return false;
        }
        return true;
      })
      // 🔥 STEP 4: Final deduplication pass
      .filter((variable, index, array) => {
        const firstIndex = array.findIndex(v => v.variableId === variable.variableId);
        if (firstIndex !== index) {
          console.warn(`[Episode StoryMap Save] 🔄 Removing duplicate variable:`, variable.variableId);
          return false;
        }
        return true;
      });

    // ทำความสะอาด nodes
    const cleanedNodes = nodes.map(node => ({
      nodeId: node.id || node.nodeId,
      nodeType: node.type || node.nodeType || node.data?.nodeType || 'scene_node',
      title: node.data?.title || node.title || 'Untitled Node',
      position: { 
        x: Math.round(node.position?.x || 0), 
        y: Math.round(node.position?.y || 0)
      },
      nodeSpecificData: node.data?.nodeSpecificData || {},
      notesForAuthor: node.data?.notesForAuthor || '',
      authorDefinedEmotionTags: node.data?.authorDefinedEmotionTags || [],
      editorVisuals: {
        color: node.data?.editorVisuals?.color || node.data?.color || '#3b82f6',
        orientation: node.data?.editorVisuals?.orientation || node.data?.nodeOrientation || 'vertical',
        icon: node.data?.editorVisuals?.icon || 'circle',
        borderStyle: node.data?.editorVisuals?.borderStyle || 'solid'
      }
    }));

    // ทำความสะอาด edges
    const cleanedEdges = edges.map(edge => ({
      edgeId: edge.id || edge.edgeId,
      sourceNodeId: edge.source || edge.sourceNodeId,
      targetNodeId: edge.target || edge.targetNodeId,
      sourceHandleId: edge.sourceHandle,
      targetHandleId: edge.targetHandle,
      label: edge.label || edge.data?.label || '',
      condition: edge.data?.condition,
      editorVisuals: {
        color: edge.data?.editorVisuals?.color || edge.style?.stroke || '#64748b',
        lineStyle: edge.data?.editorVisuals?.lineStyle || 'solid',
        animated: edge.animated || false
      }
    }));

    console.log(`[Episode StoryMap Save API] 🧹 Cleaned data:`, {
      cleanedNodeCount: cleanedNodes.length,
      cleanedEdgeCount: cleanedEdges.length,
      cleanedVariableCount: cleanedStoryVariables.length,
      finalVariables: cleanedStoryVariables.map(v => ({
        id: v.variableId,
        name: v.variableName,
        type: v.dataType
      }))
    });

    // 🔥 CRITICAL FIX: Determine startNodeId with proper validation
    const startNode = cleanedNodes.find(n => n.nodeType === 'start_node');
    const fallbackNode = cleanedNodes[0];
    let startNodeId = startNode?.nodeId || fallbackNode?.nodeId;
    
    // 🔥 PROFESSIONAL: Generate a temporary start node if none exists
    if (!startNodeId && cleanedNodes.length === 0) {
      const tempStartNodeId = `start_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      startNodeId = tempStartNodeId;
      
      // Add a default start node to prevent validation errors
      cleanedNodes.push({
        nodeId: tempStartNodeId,
        nodeType: 'start_node',
        title: 'Start',
        position: { x: 250, y: 100 },
        nodeSpecificData: {},
        notesForAuthor: '',
        authorDefinedEmotionTags: [],
        editorVisuals: {
          color: '#10b981',
          orientation: 'vertical',
          icon: 'play',
          borderStyle: 'solid'
        }
      });
      
      console.log(`[Episode StoryMap Save API] 🎯 Created temporary start node: ${tempStartNodeId}`);
    }

    // ค้นหาหรือสร้าง StoryMap สำหรับ Episode นี้
    let storyMap = await StoryMapModel.findOne({
      novelId: novel._id,
      episodeId: new Types.ObjectId(episodeId),
      isActive: true
    });

    if (!storyMap) {
      console.log(`[Episode StoryMap Save API] 📝 Creating new StoryMap for episode: ${episode.title}`);
      
      // สร้าง StoryMap ใหม่
      storyMap = new StoryMapModel({
        novelId: novel._id,
        episodeId: new Types.ObjectId(episodeId),
        title: `${episode.title} - โครงเรื่อง`,
        version: 1,
        description: `แผนผังเรื่องราวสำหรับ ${episode.title}`,
        nodes: cleanedNodes,
        edges: cleanedEdges,
        storyVariables: cleanedStoryVariables,
        startNodeId: startNodeId!, // Now guaranteed to be non-empty
        lastModifiedByUserId: userId,
        isActive: true,
        editorMetadata: {
          zoomLevel: 1,
          viewOffsetX: 0,
          viewOffsetY: 0,
          gridSize: 20,
          showGrid: true,
          showSceneThumbnails: false,
          showNodeLabels: true
        }
      });
    } else {
      console.log(`[Episode StoryMap Save API] 🔄 Updating existing StoryMap (version: ${storyMap.version})`);
      
      // 🔥 CRITICAL FIX: Clear old array completely before assigning new values
      // This prevents MongoDB from seeing old null values
      storyMap.nodes = [];
      storyMap.edges = [];
      storyMap.storyVariables = [];
      
      // Mark as modified to ensure MongoDB replaces the entire array
      storyMap.markModified('nodes');
      storyMap.markModified('edges');
      storyMap.markModified('storyVariables');
      
      // Now assign the cleaned values
      storyMap.nodes = cleanedNodes;
      storyMap.edges = cleanedEdges;
      storyMap.storyVariables = cleanedStoryVariables;
      storyMap.lastModifiedByUserId = userId;
      storyMap.version = (storyMap.version || 1) + 1;
      
      // อัปเดต startNodeId - use the validated one from above
      if (startNodeId) {
        storyMap.startNodeId = startNodeId;
      }
      
      console.log(`[Episode StoryMap Save API] ✅ Arrays cleared and reassigned:`, {
        nodes: storyMap.nodes.length,
        edges: storyMap.edges.length,
        variables: storyMap.storyVariables.length
      });
    }

    // บันทึก StoryMap
    try {
      await storyMap.save();
      console.log(`[Episode StoryMap Save API] ✅ StoryMap saved successfully (version: ${storyMap.version})`);
    } catch (saveError: any) {
      console.error(`[Episode StoryMap Save API] ❌ Save error:`, saveError);
      
      // 🔥 PROFESSIONAL: Handle different MongoDB validation errors
      if (saveError.name === 'ValidationError') {
        // Mongoose validation error - provide detailed feedback
        const validationErrors = Object.keys(saveError.errors).map(key => ({
          field: key,
          message: saveError.errors[key].message,
          value: saveError.errors[key].value
        }));
        
        console.error(`[Episode StoryMap Save API] ❌ Validation errors:`, validationErrors);
        
        return NextResponse.json({
          success: false,
          error: 'Validation error',
          message: 'StoryMap validation failed',
          details: validationErrors,
          context: {
            episodeId,
            nodeCount: cleanedNodes.length,
            startNodeId: storyMap.startNodeId,
            hasStartNode: !!startNode
          }
        }, { status: 400 });
      }
      
      // 🔥 CRITICAL: Handle duplicate key error (E11000)
      if (saveError.code === 11000) {
        console.error(`[Episode StoryMap Save API] 🚨 Duplicate key error:`, {
          code: saveError.code,
          keyPattern: saveError.keyPattern,
          keyValue: saveError.keyValue,
          message: saveError.message
        });
        
        // Check if it's the storyVariables.variableId duplicate
        if (saveError.message.includes('storyVariables.variableId')) {
          console.log(`[Episode StoryMap Save API] 🔄 Attempting to fix duplicate variableId...`);
          
          // 🔥 CRITICAL: If cleanedStoryVariables is empty, the issue is old null data in DB
          if (cleanedStoryVariables.length === 0) {
            console.log(`[Episode StoryMap Save API] 🧹 Cleaned variables is empty - forcing clear of storyVariables array`);
            
            // 🔥 PROFESSIONAL: Verify document exists before attempting update
            const documentExists = await StoryMapModel.findById(storyMap._id).select('_id');
            if (!documentExists) {
              console.error(`[Episode StoryMap Save API] 🚨 CRITICAL: StoryMap document does not exist in database!`, {
                storyMapId: storyMap._id.toString(),
                episodeId: episodeId
              });
              
              return NextResponse.json({
                success: false,
                error: 'StoryMap not found',
                message: 'The StoryMap document does not exist. It may have been deleted.',
                details: {
                  storyMapId: storyMap._id.toString(),
                  episodeId: episodeId,
                  action: 'Please refresh the page to reload the data.'
                }
              }, { status: 404 });
            }
            
            // Use $set to explicitly clear the array in MongoDB
            try {
              console.log(`[Episode StoryMap Save API] 🔄 Attempting direct update for document: ${storyMap._id}`);
              
              const updateResult = await StoryMapModel.updateOne(
                { _id: storyMap._id },
                { 
                  $set: { 
                    storyVariables: [],
                    nodes: cleanedNodes,
                    edges: cleanedEdges,
                    version: (storyMap.version || 1) + 1,
                    lastModifiedByUserId: userId,
                    updatedAt: new Date()
                  } 
                }
              );
              
              console.log(`[Episode StoryMap Save API] 📊 Update result:`, {
                matchedCount: updateResult.matchedCount,
                modifiedCount: updateResult.modifiedCount,
                acknowledged: updateResult.acknowledged
              });
              
              // 🔥 CRITICAL: If no documents matched, something is very wrong
              if (updateResult.matchedCount === 0) {
                console.error(`[Episode StoryMap Save API] 🚨 CRITICAL: No documents matched - this should not happen!`);
                
                return NextResponse.json({
                  success: false,
                  error: 'Update failed - document not matched',
                  message: 'Could not find the document to update',
                  details: {
                    storyMapId: storyMap._id.toString(),
                    episodeId: episodeId,
                    matchedCount: updateResult.matchedCount,
                    modifiedCount: updateResult.modifiedCount
                  }
                }, { status: 500 });
              }
              
              // ⚠️ WARNING: If matched but not modified, data might be the same
              if (updateResult.modifiedCount === 0) {
                console.warn(`[Episode StoryMap Save API] ⚠️ Document matched but not modified - data might be identical`);
              }
              
              console.log(`[Episode StoryMap Save API] ✅ Successfully cleared storyVariables array using direct update`);
              
              // 🎯 ADOBE/FIGMA STYLE: Reload document with retry logic
              let reloadAttempts = 0;
              const maxRetries = 3;
              
              while (reloadAttempts < maxRetries) {
                const reloadedStoryMap = await StoryMapModel.findById(storyMap._id);
                if (reloadedStoryMap) {
                  storyMap = reloadedStoryMap;
                  console.log(`[Episode StoryMap Save API] ✅ Successfully reloaded StoryMap after direct update`);
                  break;
                }
                
                reloadAttempts++;
                console.warn(`[Episode StoryMap Save API] ⚠️ Reload attempt ${reloadAttempts}/${maxRetries} failed, retrying...`);
                
                if (reloadAttempts < maxRetries) {
                  // Wait a bit before retry
                  await new Promise(resolve => setTimeout(resolve, 100 * reloadAttempts));
                }
              }
              
              // 🎯 CRITICAL: If reload fails after 3 attempts, we have a serious problem
              if (reloadAttempts === maxRetries) {
                console.error(`[Episode StoryMap Save API] 🚨 CRITICAL: Could not reload document after ${maxRetries} attempts!`);
                console.error(`[Episode StoryMap Save API] This indicates a serious database consistency issue`);
                
                // 🔥 ONE MORE TRY: Use aggregation to force a fresh read
                try {
                  const aggregationResult = await StoryMapModel.aggregate([
                    { $match: { _id: storyMap._id } },
                    { $limit: 1 }
                  ]);
                  
                  if (aggregationResult.length > 0) {
                    // Convert back to Mongoose document
                    storyMap = await StoryMapModel.hydrate(aggregationResult[0]);
                    console.log(`[Episode StoryMap Save API] ✅ Successfully reloaded using aggregation`);
                  } else {
                    throw new Error('Document not found even with aggregation');
                  }
                } catch (aggError) {
                  console.error(`[Episode StoryMap Save API] ❌ Aggregation reload also failed:`, aggError);
                  
                  // 🚨 LAST RESORT: Return error - we can't verify the save
                  return NextResponse.json({
                    success: false,
                    error: 'Save verification failed',
                    message: 'The save operation completed but we could not verify the result',
                    details: {
                      storyMapId: storyMap._id.toString(),
                      episodeId: episodeId,
                      action: 'Please refresh the page to see if your changes were saved',
                      technical: 'Document reload failed after multiple attempts'
                    }
                  }, { status: 500 });
                }
              }
              
            } catch (directUpdateError: any) {
              console.error(`[Episode StoryMap Save API] ❌ Direct update failed:`, directUpdateError);
              
              // 🎯 FIGMA STYLE: Try one more time with even more aggressive approach
              try {
                console.log(`[Episode StoryMap Save API] 🔄 Trying aggressive unset + set approach...`);
                
                await StoryMapModel.updateOne(
                  { _id: storyMap._id },
                  { $unset: { storyVariables: "" } }
                );
                
                await StoryMapModel.updateOne(
                  { _id: storyMap._id },
                  { 
                    $set: { 
                      storyVariables: [],
                      nodes: cleanedNodes,
                      edges: cleanedEdges,
                      version: (storyMap.version || 1) + 1,
                      lastModifiedByUserId: userId,
                      updatedAt: new Date()
                    } 
                  }
                );
                
                console.log(`[Episode StoryMap Save API] ✅ Aggressive approach succeeded`);
                
                // Update in-memory document
                storyMap.storyVariables = [];
                storyMap.nodes = cleanedNodes;
                storyMap.edges = cleanedEdges;
                storyMap.version = (storyMap.version || 1) + 1;
                
              } catch (aggressiveError: any) {
                console.error(`[Episode StoryMap Save API] ❌ All recovery attempts failed:`, aggressiveError);
                
                return NextResponse.json({
                  success: false,
                  error: 'Failed to clear storyVariables array',
                  message: 'All recovery attempts failed',
                  details: {
                    originalError: saveError.message,
                    updateError: directUpdateError.message,
                    aggressiveError: aggressiveError.message
                  }
                }, { status: 500 });
              }
            }
          } else {
            // 🔥 PROFESSIONAL: Verify document exists first
            const documentExists = await StoryMapModel.findById(storyMap._id).select('_id');
            if (!documentExists) {
              console.error(`[Episode StoryMap Save API] 🚨 CRITICAL: StoryMap document does not exist!`, {
                storyMapId: storyMap._id.toString(),
                episodeId: episodeId
              });
              
              return NextResponse.json({
                success: false,
                error: 'StoryMap not found',
                message: 'The StoryMap document does not exist. It may have been deleted.',
                details: {
                  storyMapId: storyMap._id.toString(),
                  episodeId: episodeId,
                  action: 'Please refresh the page to reload the data.'
                }
              }, { status: 404 });
            }
            
            // 🔥 EMERGENCY FIX: Regenerate all variableIds with absolute uniqueness
            const emergencyTimestamp = Date.now();
            const emergencySession = Math.random().toString(36).substr(2, 12);
            
            const regeneratedVariables = cleanedStoryVariables.map((v, idx) => ({
              ...v,
              variableId: `var_emergency_${emergencyTimestamp}_${emergencySession}_${idx}_${Math.random().toString(36).substr(2, 9)}`
            }));
            
            console.log(`[Episode StoryMap Save API] 🔄 Regenerating ${regeneratedVariables.length} variable IDs:`, 
              regeneratedVariables.map(v => v.variableId)
            );
            
            // Use direct update to force replace the array
            try {
              console.log(`[Episode StoryMap Save API] 🔄 Attempting direct update with regenerated IDs for document: ${storyMap._id}`);
              
              const updateResult = await StoryMapModel.updateOne(
                { _id: storyMap._id },
                { 
                  $set: { 
                    storyVariables: regeneratedVariables,
                    nodes: cleanedNodes,
                    edges: cleanedEdges,
                    version: (storyMap.version || 1) + 1,
                    lastModifiedByUserId: userId,
                    updatedAt: new Date()
                  } 
                }
              );
              
              console.log(`[Episode StoryMap Save API] 📊 Update result (regenerated):`, {
                matchedCount: updateResult.matchedCount,
                modifiedCount: updateResult.modifiedCount,
                acknowledged: updateResult.acknowledged
              });
              
              // 🔥 CRITICAL: Verify update actually happened
              if (updateResult.matchedCount === 0) {
                console.error(`[Episode StoryMap Save API] 🚨 CRITICAL: No documents matched during regeneration!`);
                
                return NextResponse.json({
                  success: false,
                  error: 'Update failed - document not matched',
                  message: 'Could not find the document to update',
                  details: {
                    storyMapId: storyMap._id.toString(),
                    episodeId: episodeId,
                    matchedCount: updateResult.matchedCount,
                    modifiedCount: updateResult.modifiedCount
                  }
                }, { status: 500 });
              }
              
              if (updateResult.modifiedCount === 0) {
                console.warn(`[Episode StoryMap Save API] ⚠️ Document matched but not modified during regeneration`);
              }
              
              console.log(`[Episode StoryMap Save API] ✅ Successfully regenerated and saved variable IDs`);
              
              // 🎯 ADOBE/FIGMA STYLE: Reload document with retry logic
              let reloadAttempts = 0;
              const maxRetries = 3;
              
              while (reloadAttempts < maxRetries) {
                const reloadedStoryMap = await StoryMapModel.findById(storyMap._id);
                if (reloadedStoryMap) {
                  storyMap = reloadedStoryMap;
                  console.log(`[Episode StoryMap Save API] ✅ Successfully reloaded StoryMap with regenerated variables`);
                  break;
                }
                
                reloadAttempts++;
                console.warn(`[Episode StoryMap Save API] ⚠️ Reload attempt ${reloadAttempts}/${maxRetries} failed, retrying...`);
                
                if (reloadAttempts < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 100 * reloadAttempts));
                }
              }
              
              // 🎯 CRITICAL: If reload fails, try aggregation as last resort
              if (reloadAttempts === maxRetries) {
                console.error(`[Episode StoryMap Save API] 🚨 CRITICAL: Could not reload document after ${maxRetries} attempts!`);
                
                // 🔥 ONE MORE TRY: Use aggregation
                try {
                  const aggregationResult = await StoryMapModel.aggregate([
                    { $match: { _id: storyMap._id } },
                    { $limit: 1 }
                  ]);
                  
                  if (aggregationResult.length > 0) {
                    storyMap = await StoryMapModel.hydrate(aggregationResult[0]);
                    console.log(`[Episode StoryMap Save API] ✅ Successfully reloaded using aggregation (with regenerated vars)`);
                  } else {
                    throw new Error('Document not found even with aggregation');
                  }
                } catch (aggError) {
                  console.error(`[Episode StoryMap Save API] ❌ Aggregation reload also failed:`, aggError);
                  
                  return NextResponse.json({
                    success: false,
                    error: 'Save verification failed',
                    message: 'The save operation completed but we could not verify the result',
                    details: {
                      storyMapId: storyMap._id.toString(),
                      episodeId: episodeId,
                      action: 'Please refresh the page to see if your changes were saved',
                      technical: 'Document reload failed after multiple attempts'
                    }
                  }, { status: 500 });
                }
              }
              
            } catch (retryError: any) {
              console.error(`[Episode StoryMap Save API] ❌ Emergency fix failed:`, retryError);
              
              // 🎯 LAST RESORT: Try $unset + $set approach
              try {
                console.log(`[Episode StoryMap Save API] 🔄 Last resort: unset + set with regenerated IDs...`);
                
                await StoryMapModel.updateOne(
                  { _id: storyMap._id },
                  { $unset: { storyVariables: "" } }
                );
                
                await StoryMapModel.updateOne(
                  { _id: storyMap._id },
                  { 
                    $set: { 
                      storyVariables: regeneratedVariables,
                      nodes: cleanedNodes,
                      edges: cleanedEdges,
                      version: (storyMap.version || 1) + 1,
                      lastModifiedByUserId: userId,
                      updatedAt: new Date()
                    } 
                  }
                );
                
                console.log(`[Episode StoryMap Save API] ✅ Last resort succeeded`);
                
                // Update in-memory document
                storyMap.storyVariables = regeneratedVariables;
                storyMap.nodes = cleanedNodes;
                storyMap.edges = cleanedEdges;
                storyMap.version = (storyMap.version || 1) + 1;
                
              } catch (lastResortError: any) {
                console.error(`[Episode StoryMap Save API] ❌ All recovery attempts failed:`, lastResortError);
                
                return NextResponse.json({
                  success: false,
                  error: 'Duplicate key error - all recovery attempts failed',
                  message: 'Failed to resolve duplicate variable IDs after multiple attempts',
                  details: {
                    originalError: saveError.message,
                    retryError: retryError.message,
                    lastResortError: lastResortError.message,
                    attemptedVariables: regeneratedVariables.map(v => ({ id: v.variableId, name: v.variableName }))
                  }
                }, { status: 500 });
              }
            }
          }
        } else {
          // Other duplicate key errors
          return NextResponse.json({
            success: false,
            error: 'Duplicate key error',
            message: saveError.message,
            details: {
              keyPattern: saveError.keyPattern,
              keyValue: saveError.keyValue
            }
          }, { status: 409 });
        }
      } else {
        throw saveError;
      }
    }

    // ส่ง response กลับ
    return NextResponse.json({
      success: true,
      message: 'StoryMap saved successfully',
      storyMap: {
        _id: storyMap._id,
        version: storyMap.version,
        nodes: storyMap.nodes,
        edges: storyMap.edges,
        storyVariables: storyMap.storyVariables,
        updatedAt: storyMap.updatedAt
      },
      episode: {
        _id: episode._id,
        title: episode.title,
        episodeOrder: episode.episodeOrder,
        status: episode.status
      },
      newVersion: storyMap.version,
      version: storyMap.version
    });

  } catch (error: any) {
    console.error('[Episode StoryMap Save API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

