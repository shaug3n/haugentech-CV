export type PostFormState = {
  dirty: boolean;
  pendingUploads: Record<string, number>;
};

export type PostFormAction =
  | { type: "change" }
  | { type: "pending"; field: string; count: number }
  | { type: "submitted" };

export const initialPostFormState: PostFormState = {
  dirty: false,
  pendingUploads: {},
};

export function reducePostFormState(
  state: PostFormState,
  action: PostFormAction,
): PostFormState {
  switch (action.type) {
    case "change":
      return state.dirty ? state : { ...state, dirty: true };
    case "pending": {
      const pendingUploads = { ...state.pendingUploads };
      if (action.count > 0) {
        pendingUploads[action.field] = action.count;
      } else {
        delete pendingUploads[action.field];
      }
      return { ...state, pendingUploads };
    }
    case "submitted":
      return state.dirty ? { ...state, dirty: false } : state;
  }
}

export function hasPendingUploads(state: PostFormState): boolean {
  return Object.values(state.pendingUploads).some((count) => count > 0);
}
