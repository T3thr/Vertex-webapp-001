import dbConnect from "@/backend/lib/mongodb";
import CommentModel, { CommentStatus, CommentableType, IComment } from "@/backend/models/Comment";
import UserModel from "@/backend/models/User";
import mongoose, { Types } from "mongoose";

export type CreateCommentInput = {
  userId: string;
  targetId: string;
  targetType: CommentableType;
  content: string;
  parentCommentId?: string | null;
  mentionedUserIds?: string[];
  context?: {
    novelId?: string;
    episodeId?: string;
    boardId?: string;
  };
  meta?: {
    ip?: string;
    userAgent?: string;
  };
};

export type ListCommentsQuery = {
  targetId: string;
  targetType: CommentableType;
  parentCommentId?: string | null;
  page?: number;
  limit?: number;
  sort?: "new" | "old" | "top";
  includePinnedFirst?: boolean;
};

export type UpdateCommentInput = {
  commentId: string;
  userId: string; // only owner can edit via this method
  newContent: string;
};

export type DeleteCommentInput = {
  commentId: string;
  userId: string;
  asModerator?: boolean; // if true, mark as deleted_by_moderator
  reason?: string;
};

function toObjectId(id: string): Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid ObjectId: " + id);
  }
  return new mongoose.Types.ObjectId(id);
}

export const CommentingService = {
  async create(input: CreateCommentInput) {
    await dbConnect();

    const userId = toObjectId(input.userId);
    const targetId = toObjectId(input.targetId);

    let parentId: Types.ObjectId | undefined;
    if (input.parentCommentId) {
      parentId = toObjectId(input.parentCommentId);
    }

    const mentionedIds: Types.ObjectId[] | undefined = input.mentionedUserIds?.map(toObjectId);

    const doc = await CommentModel.create({
      userId,
      targetId,
      targetType: input.targetType,
      parentCommentId: parentId ?? null,
      content: input.content.trim(),
      mentionedUserIds: mentionedIds,
      status: CommentStatus.VISIBLE,
      statusReason: undefined,
      novelId: input.context?.novelId ? toObjectId(input.context.novelId) : undefined,
      episodeId: input.context?.episodeId ? toObjectId(input.context.episodeId) : undefined,
      boardId: input.context?.boardId ? toObjectId(input.context.boardId) : undefined,
      userIpAddress: input.meta?.ip,
      userAgent: input.meta?.userAgent,
    });

    // Populate basic user info for immediate display
    const populated = await CommentModel.findById(doc._id)
      .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
      .lean();

    return populated as unknown as IComment & { userId: any };
  },

  async list(query: ListCommentsQuery) {
    await dbConnect();

    const targetId = toObjectId(query.targetId);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    // Base filter
    const filter: any = {
      targetId,
      targetType: query.targetType,
      status: CommentStatus.VISIBLE,
    };

    if (query.parentCommentId === undefined) {
      // Only top-level when not specified
      filter.depth = 0;
    } else if (query.parentCommentId) {
      filter.parentCommentId = toObjectId(query.parentCommentId);
    } else {
      filter.parentCommentId = null;
    }

    let sort: any = { createdAt: -1 };
    if (query.sort === "old") sort = { createdAt: 1 };
    if (query.sort === "top") sort = { isPinned: -1, likesCount: -1, createdAt: -1 };

    const pinnedFirst = query.includePinnedFirst ?? true;
    const finalSort = pinnedFirst ? { isPinned: -1, ...sort } : sort;

    const [total, comments] = await Promise.all([
      CommentModel.countDocuments(filter),
      CommentModel.find(filter)
        .sort(finalSort)
        .skip(skip)
        .limit(limit)
        .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
        .lean(),
    ]);

    return { total, page, limit, comments };
  },

  async getById(commentId: string) {
    await dbConnect();
    const _id = toObjectId(commentId);
    const comment = await CommentModel.findById(_id)
      .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
      .lean();
    return comment;
  },

  async listReplies(parentCommentId: string, opts?: { page?: number; limit?: number }) {
    await dbConnect();
    const parentId = toObjectId(parentCommentId);

    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));
    const skip = (page - 1) * limit;

    const [total, replies] = await Promise.all([
      CommentModel.countDocuments({ parentCommentId: parentId, status: CommentStatus.VISIBLE }),
      CommentModel.find({ parentCommentId: parentId, status: CommentStatus.VISIBLE })
        .sort({ isPinned: -1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
        .lean(),
    ]);

    return { total, page, limit, replies };
  },

  async updateContent(input: UpdateCommentInput) {
    await dbConnect();

    const commentId = toObjectId(input.commentId);
    const userId = toObjectId(input.userId);

    const existing = await CommentModel.findById(commentId).select("userId content status");
    if (!existing) {
      throw new Error("Comment not found");
    }
    if (existing.userId.toString() !== userId.toString()) {
      throw new Error("Forbidden: cannot edit others' comments");
    }
    if (existing.status !== CommentStatus.VISIBLE) {
      throw new Error("Cannot edit non-visible comment");
    }

    const updated = await CommentModel.findByIdAndUpdate(
      commentId,
      {
        $set: {
          content: input.newContent.trim(),
          isEdited: true,
          lastEditedAt: new Date(),
        },
        $push: {
          editHistory: {
            editedAt: new Date(),
            editedByUserId: userId,
            previousContent: existing.content,
          },
        },
      },
      { new: true }
    )
      .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
      .lean();

    return updated;
  },

  async softDelete(input: DeleteCommentInput) {
    await dbConnect();

    const commentId = toObjectId(input.commentId);
    const userId = toObjectId(input.userId);

    const existing = await CommentModel.findById(commentId).select("userId status");
    if (!existing) {
      throw new Error("Comment not found");
    }

    let newStatus: CommentStatus;
    if (input.asModerator) {
      newStatus = CommentStatus.DELETED_BY_MODERATOR;
    } else {
      if (existing.userId.toString() !== userId.toString()) {
        throw new Error("Forbidden: cannot delete others' comments");
      }
      newStatus = CommentStatus.DELETED_BY_USER;
    }

    const updated = await CommentModel.findByIdAndUpdate(
      commentId,
      {
        $set: {
          status: newStatus,
          statusReason: input.reason,
          hiddenOrDeletedByUserId: userId,
        },
      },
      { new: true }
    )
      .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
      .lean();

    return updated;
  },

  async pin(commentId: string, actorUserId: string, pin: boolean) {
    await dbConnect();
    const _id = toObjectId(commentId);
    const actorId = toObjectId(actorUserId);

    // Note: Authorization checks (author/moderator) should be handled by caller
    const updated = await CommentModel.findByIdAndUpdate(
      _id,
      {
        $set: {
          isPinned: pin,
          pinnedAt: pin ? new Date() : undefined,
          // moderationDetails could be appended here as needed
        },
      },
      { new: true }
    )
      .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
      .lean();

    return updated;
  },
};

export default CommentingService;
