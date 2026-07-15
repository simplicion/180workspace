import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  loginModal: {
    isOpen: false,
    title: "Login Required",
    message: "Please log in to continue with this action.",
  },
  userLocation: null, // { lat, lng, city, state }
  locationStatus: "detecting", // "detecting" | "granted" | "denied"
  locationSidebar: {
    isOpen: false,
  },
  mainSidebar: {
    isOpen: false,
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openLoginModal: (state, action) => {
      state.loginModal.isOpen = true;
      state.loginModal.title = action.payload?.title || "Login Required";
      state.loginModal.message =
        action.payload?.message ||
        "Please log in to continue with this action.";
    },
    closeLoginModal: (state) => {
      state.loginModal.isOpen = false;
    },
    setUserLocation: (state, action) => {
      state.userLocation = action.payload;
    },
    setLocationStatus: (state, action) => {
      state.locationStatus = action.payload;
    },
    openLocationSidebar: (state) => {
      state.locationSidebar.isOpen = true;
    },
    closeLocationSidebar: (state) => {
      state.locationSidebar.isOpen = false;
    },
    openMainSidebar: (state) => {
      state.mainSidebar.isOpen = true;
    },
    closeMainSidebar: (state) => {
      state.mainSidebar.isOpen = false;
    },
  },
});

export const {
  openLoginModal,
  closeLoginModal,
  setUserLocation,
  setLocationStatus,
  openLocationSidebar,
  closeLocationSidebar,
  openMainSidebar,
  closeMainSidebar,
} = uiSlice.actions;
export default uiSlice.reducer;
