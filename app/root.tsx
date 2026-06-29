import React from "react";
import { Outlet } from "react-router";
import "./styles.css";

export default function Root() {
  return <Outlet />;
}
