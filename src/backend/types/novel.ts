export interface Novel {
    _id: string;
    title: string;
    description: string;
    coverImage: string;
    tags: string[];
    status: "Draft" | "Published" | "Archived";
    config: {
      theme?: string;
      engineLogic?: string;
      [key: string]: any;
    };
    episodes: string[];
    author: string;
    createdAt: string;
    updatedAt: string;
  }