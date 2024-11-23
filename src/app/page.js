"use client";
import { useState } from "react";
import MetadataUpload from "@/components/MetadataUpload";
import MetadataTypeSelector from "@/components/MetadataTypeSelector";
import DataUpload from "@/components/DataUpload";

export default function Home() {
  const [selectedType, setSelectedType] = useState("");

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Vamos a validar tus datos</h1>

      <h2 className="text-xl mt-8">Primero, sube tus metadatos:</h2>
      <div className="mt-6">
        <MetadataUpload />
      </div>

      <h2 className="text-xl mt-8">Selecciona el tipo de dato:</h2>
      <MetadataTypeSelector onTypeSelect={setSelectedType} />

      <DataUpload selectedType={selectedType} />
    </div>
  );
}
