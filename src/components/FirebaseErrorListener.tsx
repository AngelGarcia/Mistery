"use client";

import React, { useEffect } from "react";
import { errorEmitter } from "@/firebase/error-emitter";
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from "@/firebase/errors";

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error("Firestore Permission Error caught by listener:", error.toString());

      // In a development environment, we can throw the error to show the Next.js overlay
      if (process.env.NODE_ENV === "development") {
        // We throw it in a timeout to break out of the current render cycle
        setTimeout(() => {
          throw error;
        }, 0);
      } else {
        // In production, you might want to show a generic toast or log to a monitoring service
        toast({
          variant: "destructive",
          title: "Error de permisos",
          description: "No tienes permiso para realizar esta acción.",
        });
      }
    };

    errorEmitter.on("permission-error", handlePermissionError);

    return () => {
      errorEmitter.off("permission-error", handlePermissionError);
    };
  }, [toast]);

  return null; // This component does not render anything
}

    