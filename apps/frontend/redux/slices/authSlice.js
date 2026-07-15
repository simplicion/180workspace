// src/redux/slices/authSlice.js
import { createSlice } from "@reduxjs/toolkit";

// Mirror server-side privacy truth into localStorage so the geolocation watcher
// in SocketContext respects the user's setting across devices/sessions.
const syncLocationSharingFlag = (user) => {
  if (typeof window === "undefined" || !user) return;
  if (typeof user.locationSharingEnabled !== "boolean") return;
  try {
    localStorage.setItem(
      "kridaz_location_sharing",
      String(user.locationSharingEnabled)
    );
  } catch {
    /* private mode / quota — non-fatal */
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState: {
    isLoggedIn: false,
    isAuthenticated: false,
    token: null,
    role: null,
    user: null,
    followingIds: [],
    isRestored: false,
  },
  reducers: {
    login: (state, action) => {
      state.token = action.payload.token || state.token;
      state.role = action.payload.role || state.role;
      state.user = action.payload.user || state.user;
      state.followingIds = action.payload.followingIds || [];
      state.isAuthenticated = true;
      state.isLoggedIn = true;
      syncLocationSharingFlag(state.user);
    },
    logout: (state) => {
      state.token = null;
      state.role = null;
      state.user = null;
      state.followingIds = [];
      state.isAuthenticated = false;
      state.isLoggedIn = false;
    },
    restoreAuth: (state, action) => {
      state.user = action.payload.user || state.user;
      state.role = action.payload.role || state.role;
      state.token = action.payload.token || state.token;
      state.followingIds = action.payload.followingIds || state.followingIds;
      state.isAuthenticated = true;
      state.isLoggedIn = true;
      syncLocationSharingFlag(state.user);
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      syncLocationSharingFlag(state.user);
    },
    setFollowingIds: (state, action) => {
      state.followingIds = action.payload;
    },
    followUser: (state, action) => {
      if (!state.followingIds.includes(action.payload)) {
        state.followingIds.push(action.payload);
      }
    },
    unfollowUser: (state, action) => {
      state.followingIds = state.followingIds.filter(
        (id) => id !== action.payload
      );
    },
    markRestored: (state) => {
      state.isRestored = true;
    },
  },
});

export const {
  login,
  logout,
  updateUser,
  restoreAuth,
  setFollowingIds,
  followUser,
  unfollowUser,
  markRestored,
} = authSlice.actions;
export default authSlice.reducer;
