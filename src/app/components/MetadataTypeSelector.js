
import { useState } from "react";

const MetadataTypeSelector = ({ onTypeSelect }) => {
  const [selectedType, setSelectedType] = useState("");

  const handleSelect = (type) => {
    setSelectedType(type);
    onTypeSelect(type);
  };

  return (
    <div className="flex space-x-4 mt-4">
      <button
        onClick={() => handleSelect("Vector")}
        className={`px-4 py-2 rounded-md ${
          selectedType === "Vector" ? "bg-blue-500 text-white" : "bg-gray-200"
        }`}
      >
        Vector
      </button>
      <button
        onClick={() => handleSelect("Raster")}
        className={`px-4 py-2 rounded-md ${
          selectedType === "Raster" ? "bg-blue-500 text-white" : "bg-gray-200"
        }`}
      >
        Ráster
      </button>
      <button
        onClick={() => handleSelect("Geoservicio")}
        className={`px-4 py-2 rounded-md ${
          selectedType === "Geoservicio"
            ? "bg-blue-500 text-white"
            : "bg-gray-200"
        }`}
      >
        Geoservicio
      </button>
    </div>
  );
};

export default MetadataTypeSelector;
