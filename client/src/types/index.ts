export interface PostDraft {
  id: number;
  text: string;
  image: string | null;
  product: string;
  postType: "general" | "promotion" | "event" | "seasonal";
  date: string;
}

export interface GeneratedPost {
  text: string;
}

export interface GeneratePostRequest {
  productName?: string;
  postType: "general" | "promotion" | "event" | "seasonal";
  image?: string;
}
