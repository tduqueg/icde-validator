
const MetadataUpload = () => {
  return (
    <div className="border-2 border-blue-500 border-dashed p-4 rounded-lg text-center">
      <input type="file" accept=".xml" className="hidden" id="metadataFile" />
      <label
        htmlFor="metadataFile"
        className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md"
      >
        Selecciona el archivo
      </label>
      <p className="text-gray-500 mt-2">
        Arrastra o selecciona aquí el archivo (formato válido XML)
      </p>
    </div>
  );
};

export default MetadataUpload;
