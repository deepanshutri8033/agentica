"use client";

import React, { useEffect } from "react";
import axios from "axios";
import { useUser } from "@clerk/nextjs";
import { UserDetailContext } from "@/context/userDetailContext";
import { useStackId } from "recharts/types/cartesian/BarStack";
import { useState } from "react";

function Provider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const [userDetail,setUserDetail]=useState();


  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      createNewUser();
    }
  }, [user, isLoaded]);

  const createNewUser = async () => {
    try {
      const result = await axios.post("/api/users");
      console.log("User sync result:", result.data);
      setUserDetail(result.data);
    } catch (error) {
      console.error("Error creating/syncing user:", error);
    }
  };

  return (<div>
            <UserDetailContext.Provider value={{}}>
              {children}
            </UserDetailContext.Provider>
          </div>);
}

export default Provider;