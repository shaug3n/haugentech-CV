"use client";

import { createContext, useContext, type ReactNode } from "react";

type PostEditFormContextValue = {
  markDirty(): void;
  reportPendingUploads(name: string, count: number): void;
};

const noOpContext: PostEditFormContextValue = {
  markDirty: () => {},
  reportPendingUploads: () => {},
};

export const PostEditFormContext = createContext<PostEditFormContextValue>(noOpContext);

export function PostEditFormProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: PostEditFormContextValue;
}) {
  return (
    <PostEditFormContext.Provider value={value}>
      {children}
    </PostEditFormContext.Provider>
  );
}

export function usePostEditFormContext(): PostEditFormContextValue {
  return useContext(PostEditFormContext);
}
