import { Post } from "../types";

export const postService = {
  async fetchPosts(): Promise<Post[]> {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts");
    if (!response.ok) {
      throw new Error("Failed to fetch posts");
    }
    return response.json();
  }
};
