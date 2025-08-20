'use client';

import { useEffect, useState } from "react";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";

export default function Tasks() {
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
        setLoading(false);
    }, []);
  
    return (
      <>
          {loading ? (
              <div className="spinner-wrapper">
                  <Spinner noText />
              </div>
          ) : (
              <div>
                Zadania
              </div>
          )}
      </>
    );
}