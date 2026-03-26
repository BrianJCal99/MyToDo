import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  id: string | null;
  firstName: string | null;
  email: string | null;
  isLoggedIn: boolean;
}

const initialState: UserState = {
  id: null,
  firstName: null,
  email: null,
  isLoggedIn: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<{ id: string; firstName: string; email: string }>) {
      state.id = action.payload.id;
      state.firstName = action.payload.firstName;
      state.email = action.payload.email;
      state.isLoggedIn = true;
    },
    clearUser(state) {
      state.id = null;
      state.firstName = null;
      state.email = null;
      state.isLoggedIn = false;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
