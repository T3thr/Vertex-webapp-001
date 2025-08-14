// src/app/api/novels/[slug]/storymap/patch/route.ts
// High-performance patch-based StoryMap updates API
// Professional-grade สำหรับ real-time collaboration และ optimistic updates

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import StoryMapModel from '@/backend/models/StoryMap';
import NovelModel from '@/backend/models/Novel';
import dbConnect from '@/backend/lib/mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { command, etag, lastSyncedAt } = body;
    const commandId = request.headers.get('X-Command-Id');

    // หา Novel
    const novel = await NovelModel.findOne({ slug }).select('_id author');
    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์
    if (novel.author.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // หา StoryMap ปัจจุบัน
    const currentStoryMap = await StoryMapModel.findOne({ 
      novelId: novel._id, 
      isActive: true 
    });

    if (!currentStoryMap) {
      return NextResponse.json({ error: 'StoryMap not found' }, { status: 404 });
    }

    // Optimistic Concurrency Control
    const currentEtag = currentStoryMap.version?.toString() || '1';
    if (etag && etag !== currentEtag) {
      return NextResponse.json({ 
        error: 'Version conflict', 
        currentVersion: currentStoryMap.version,
        conflictResolution: 'reload_required' 
      }, { status: 409 });
    }

    // ตรวจสอบ idempotency
    if (commandId && currentStoryMap.pendingCommands) {
      const existingCommand = currentStoryMap.pendingCommands.find(
        cmd => cmd.commandId === commandId
      );
      if (existingCommand && existingCommand.applied) {
        // Command ถูกประมวลผลแล้ว ส่งกลับผลลัพธ์เดิม
        return NextResponse.json({ 
          success: true, 
          version: currentStoryMap.version,
          alreadyProcessed: true 
        });
      }
    }

    let updateData: any = {
      version: currentStoryMap.version + 1,
      lastModifiedByUserId: session.user.id,
      lastSyncedAt: new Date(lastSyncedAt || Date.now()),
      updatedAt: new Date()
    };

    // เพิ่ม command ใน pending commands สำหรับ audit trail
    if (command && commandId) {
      const pendingCommand = {
        commandId,
        userId: session.user.id,
        type: command.type,
        timestamp: new Date(),
        data: command.changes,
        applied: true
      };

      updateData.$push = {
        pendingCommands: {
          $each: [pendingCommand],
          $slice: -100 // เก็บแค่ 100 commands ล่าสุด
        }
      };
    }

    // Apply patch changes
    if (command?.changes) {
      if (command.changes.nodes) {
        // Update หรือ add nodes
        for (const nodeUpdate of command.changes.nodes) {
          const existingNodeIndex = currentStoryMap.nodes.findIndex(
            n => n.nodeId === nodeUpdate.id
          );
          
          if (existingNodeIndex >= 0) {
            // Update existing node
            updateData[`nodes.${existingNodeIndex}`] = {
              ...currentStoryMap.nodes[existingNodeIndex],
              ...nodeUpdate.data,
              position: nodeUpdate.position
            };
          } else {
            // Add new node
            updateData.$push = updateData.$push || {};
            updateData.$push.nodes = nodeUpdate;
          }
        }
      }

      if (command.changes.edges) {
        // Update หรือ add edges
        for (const edgeUpdate of command.changes.edges) {
          const existingEdgeIndex = currentStoryMap.edges.findIndex(
            e => e.edgeId === edgeUpdate.id
          );
          
          if (existingEdgeIndex >= 0) {
            // Update existing edge
            updateData[`edges.${existingEdgeIndex}`] = {
              ...currentStoryMap.edges[existingEdgeIndex],
              ...edgeUpdate.data
            };
          } else {
            // Add new edge
            updateData.$push = updateData.$push || {};
            updateData.$push.edges = edgeUpdate;
          }
        }
      }
    }

    // Update editor metadata if provided
    if (command?.editorMetadata) {
      updateData.editorMetadata = {
        ...currentStoryMap.editorMetadata,
        ...command.editorMetadata
      };
    }

    // Apply the update
    const updatedStoryMap = await StoryMapModel.findByIdAndUpdate(
      currentStoryMap._id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!updatedStoryMap) {
      return NextResponse.json({ error: 'Failed to update StoryMap' }, { status: 500 });
    }

    // อัปเดต Novel's lastContentUpdatedAt
    await NovelModel.findByIdAndUpdate(novel._id, {
      lastContentUpdatedAt: new Date()
    });

    // TODO: Emit WebSocket event สำหรับ real-time collaboration
    // await emitStoryMapUpdate(updatedStoryMap._id, {
    //   type: 'patch_applied',
    //   command,
    //   userId: session.user.id,
    //   version: updatedStoryMap.version
    // });

    return NextResponse.json({
      success: true,
      version: updatedStoryMap.version,
      etag: updatedStoryMap.version.toString(),
      storyMap: {
        _id: updatedStoryMap._id,
        version: updatedStoryMap.version,
        lastSyncedAt: updatedStoryMap.lastSyncedAt,
        editorMetadata: updatedStoryMap.editorMetadata
      }
    });

  } catch (error: any) {
    console.error('PATCH StoryMap error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
