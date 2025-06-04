// src/types/WriterApplication.ts

export enum WriterApplicationStatus {
    PENDING_REVIEW = "pending_review",
    UNDER_REVIEW = "under_review",
    APPROVED = "approved",
    REJECTED = "rejected",
    REQUIRES_MORE_INFO = "requires_more_info",
    CANCELLED = "cancelled",
  }
  
  // (Optional) ถ้าต้องการใช้ interface IWriterApplication ใน client (เฉพาะ type เท่านั้น)
  export interface IWriterApplication {
    _id: string;
    displayName: string;
    applicationReason?: string;
    contactEmail?: string;
    status: WriterApplicationStatus;
    rejectionReason?: string;
    adminNotes?: string;
    // ... เพิ่ม field ที่ client ต้องใช้จริงๆ เท่านั้น
  }