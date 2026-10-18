"use client";

import { useCallback, useEffect, useReducer, type FormEvent, type ReactNode } from "react";
import { updatePost } from "@/app/admin/posts/actions";
import { PostEditFormProvider } from "@/components/admin/post-editor/form-context";
import {
  hasPendingUploads,
  initialPostFormState,
  reducePostFormState,
} from "@/lib/admin/post-editor/form-state";

export function PostEditForm({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    reducePostFormState,
    initialPostFormState,
  );
  const pending = hasPendingUploads(state);
  const markDirty = useCallback(() => dispatch({ type: "change" }), []);
  const reportPendingUploads = useCallback(
    (field: string, count: number) =>
      dispatch({ type: "pending", field, count }),
    [],
  );

  useEffect(() => {
    if (!state.dirty) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [state.dirty]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (pending) {
      event.preventDefault();
      return;
    }
    dispatch({ type: "submitted" });
  };

  return (
    <PostEditFormProvider value={{ markDirty, reportPendingUploads }}>
      <form
        action={updatePost}
        onSubmit={handleSubmit}
        onChange={markDirty}
        className="flex flex-col gap-5"
      >
        {children}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save
        </button>
      </form>
    </PostEditFormProvider>
  );
}
