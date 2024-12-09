// Base post data
export type PostData = {
    postId: string;
    postType: string;
  };
  
  // Drawing post
  export type ImagePostData = {
    postId: string;
    postType: string;
    word: string;
   
    data: string[];
    authorUsername: string;
    date: number;
    solves: number;
    skips: number;
  };
  
  // Collections
  export type CollectionData = Pick<ImagePostData, 'postId' | 'data' | 'authorUsername'>;
  export type CollectionPostData = {
    postId: string;
    postType: string;
    data: CollectionData[];
    timeframe: string;
  };
  
  // Pinned post
  export type PinnedPostData = {
    postId: string;
    postType: string;
  };
  