import { useState } from "react";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import JSZip from "jszip";

console.log("Server IP:", process.env.NEXT_PUBLIC_SERVER_IP);
// Data type enum mapping
const DataTypes = {
  GDB: 0,
  Polygon: 1,
  Line: 2,
  Point: 3,
  DigitalTerrainModel: 4,
  Orthoimages: 5,
};

// Validation result titles mapping
const ValidationTitles = {
  valores_nulos: "Errores Valores Nulos",
  dentro_de_origen: "Errores capas fuera de Colombia",
  consistencia_de_origen: "Errores de Origen",
  hueco_en_capa: "Errores de Huecos",
  superposicion: "Errores de Superposición",
  bandas: "Errores de Bandas",
  radiometria: "Errores de radiometria",
};

const SimpleAlert = ({ children, variant = "error" }) => {
  const baseClasses = "p-4 rounded-lg my-4";
  const variantClasses = {
    error: "bg-red-100 text-red-700 border border-red-400",
    success: "bg-green-100 text-green-700 border border-green-400",
    warning: "bg-yellow-100 text-yellow-700 border border-yellow-400",
    info: "bg-blue-100 text-blue-700 border border-blue-400",
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </div>
  );
};

const ValidationResults = ({ results }) => {
  if (!results) return null;

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-xl font-semibold">Resultados de Validación</h3>
      {Object.entries(results).map(([key, errors]) => {
        if (errors && errors.length > 0) {
          return (
            <div key={key} className="mb-4">
              <h4 className="text-lg font-medium mb-2">
                {ValidationTitles[key]}
              </h4>
              <SimpleAlert variant="error">
                <ul className="list-disc pl-4">
                  {errors.map((error, index) => (
                    <li key={index} className="mt-1">
                      {error}
                    </li>
                  ))}
                </ul>
              </SimpleAlert>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

const s3Client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.NEXT_PUBLIC_AWS_SESSION_TOKEN,
  },
});

const DataUpload = ({ selectedType }) => {
  const [selectedSubtype, setSelectedSubtype] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [validationResults, setValidationResults] = useState(null);

  const getDataType = (subtype) => {
    switch (subtype) {
      case "gdb":
        return DataTypes.GDB;
      case "polygon":
        return DataTypes.Polygon;
      case "line":
        return DataTypes.Line;
      case "point":
        return DataTypes.Point;
      case "dtm":
        return DataTypes.DigitalTerrainModel;
      case "orthoimage":
        return DataTypes.Orthoimages;
      default:
        return null;
    }
  };

  const uploadToS3 = async (file) => {
    try {
      const timestamp = Date.now();
      const bucketName = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME;

      if (
        file.type === "application/zip" ||
        file.type === "application/x-zip-compressed"
      ) {
        // Leer el archivo como ArrayBuffer
        const zipBuffer = await file.arrayBuffer();
        const zip = new JSZip();

        // Cargar el ZIP con opciones específicas para GDB
        const zipContents = await zip.loadAsync(zipBuffer, {
          createFolders: true,
          checkCRC32: false, // Deshabilitar verificación CRC32 para archivos problemáticos
        });

        const uploadPromises = [];
        let totalFiles = 0;
        let processedFiles = 0;

        // Primero, contar archivos válidos y encontrar la carpeta GDB
        let gdbFolderName = "";
        for (const [filename, zipEntry] of Object.entries(zipContents.files)) {
          if (!zipEntry.dir && filename.includes(".gdb/")) {
            totalFiles++;
            if (!gdbFolderName) {
              gdbFolderName = filename.split(".gdb/")[0] + ".gdb";
            }
          }
        }

        // Procesar solo los archivos dentro de la carpeta GDB
        for (const [filename, zipEntry] of Object.entries(zipContents.files)) {
          if (!zipEntry.dir && filename.startsWith(gdbFolderName)) {
            try {
              // Usar Uint8Array para mejor manejo de datos binarios
              const content = await zipEntry.async("uint8array", {
                compression: "STORE", // Sin compresión adicional
              });

              // Mantener la estructura de carpetas original
              const relativePath = filename.split(gdbFolderName + "/")[1];
              const s3Key = `files/${selectedType.toLowerCase()}/${selectedSubtype}/${timestamp}_${gdbFolderName}/${relativePath}`;

              // Crear el Blob con el tipo MIME correcto
              const blob = new Blob([content], {
                type: "application/octet-stream",
              });

              const uploadParams = {
                Bucket: bucketName,
                Key: s3Key,
                Body: blob,
                ContentType: "application/octet-stream",
              };

              const command = new PutObjectCommand(uploadParams);

              uploadPromises.push(
                s3Client
                  .send(command)
                  .then(() => {
                    processedFiles++;
                    const progress = (processedFiles / totalFiles) * 100;
                    console.log(
                      `Uploaded ${filename} - Progress: ${progress}%`
                    );
                  })
                  .catch((err) => {
                    console.error(`Error al subir ${filename}:`, err);
                    throw new Error(
                      `Error al subir ${filename}: ${err.message}`
                    );
                  })
              );
            } catch (err) {
              console.error(`Error procesando ${filename}:`, err);
              continue; // Continuar con el siguiente archivo si hay error
            }
          }
        }

        // Esperar a que todas las subidas terminen
        await Promise.all(uploadPromises);

        return `s3://${bucketName}/files/${selectedType.toLowerCase()}/${selectedSubtype}/${timestamp}_${gdbFolderName}`;
      } else {
        // Si no es ZIP, mantener la lógica original
        const uniqueFileName = `files/${selectedType.toLowerCase()}/${selectedSubtype}/${timestamp}_${
          file.name
        }`;

        const uploadParams = {
          Bucket: bucketName,
          Key: uniqueFileName,
          Body: file,
          ContentType: file.type,
        };

        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        return `s3://${bucketName}/${uniqueFileName}`;
      }
    } catch (error) {
      console.error("Error detallado de S3:", error);
      if (error.name === "CredentialsProviderError") {
        throw new Error(
          "Error de credenciales de AWS Academy. Verifica que el sessionToken esté actualizado."
        );
      }
      throw new Error(`Error en la subida a S3: ${error.message}`);
    }
  };

  const handleGDBUpload = async (file) => {
    if (
      file.type === "application/x-zip-compressed" ||
      file.type === "application/zip"
    ) {
      try {
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(file);
        const entries = Object.keys(zipContents.files);

        const gdbFolder = entries.find((entry) => {
          const normalizedEntry = entry.toLowerCase();
          return (
            normalizedEntry.includes(".gdb/") ||
            normalizedEntry.includes(".gdb\\") ||
            normalizedEntry.endsWith(".gdb")
          );
        });

        if (!gdbFolder) {
          throw new Error(
            "No se encontró una carpeta GDB válida en el archivo ZIP."
          );
        }

        const gdbBase = gdbFolder.split("/")[0];
        const filesInGdb = entries.filter(
          (entry) => entry.startsWith(gdbBase) && !entry.endsWith("/")
        );

        if (filesInGdb.length === 0) {
          throw new Error(
            "La carpeta GDB está vacía o no contiene archivos válidos."
          );
        }

        const essentialExtensions = [".gdbtable", ".gdbindexes", ".gdbtablx"];
        const containsEssentialFiles = filesInGdb.some((filename) =>
          essentialExtensions.some((ext) =>
            filename.toLowerCase().endsWith(ext)
          )
        );

        if (!containsEssentialFiles) {
          throw new Error(
            "La carpeta GDB no contiene los archivos esenciales necesarios."
          );
        }

        return await uploadToS3(file);
      } catch (error) {
        throw new Error(`Error procesando el archivo: ${error.message}`);
      }
    } else {
      throw new Error(
        "Por favor, sube un archivo ZIP que contenga una carpeta GDB válida."
      );
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    setValidationResults(null);

    try {
      let s3Uri;
      console.log("Iniciando proceso de subida para:", file.name);

      if (selectedSubtype === "gdb") {
        s3Uri = await handleGDBUpload(file);
      } else {
        s3Uri = await uploadToS3(file);
      }

      const dataType = getDataType(selectedSubtype);
      if (dataType === null) {
        throw new Error("Tipo de dato no válido");
      }

      setUploadProgress(50);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_IP}/process-data/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data_type: dataType,
            s3_bucket_uri: s3Uri,
          }),
        }
      );
      console.log("Proceso de datos completado:", response);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error en la validación del archivo");
      }

      setValidationResults(data);
      setUploadProgress(100);
    } catch (error) {
      console.error("Error durante la subida:", error);
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const getAcceptedFileTypes = () => {
    if (selectedType === "Vector") {
      if (selectedSubtype === "gdb") {
        return ".zip";
      }
      return ".gpkg,.shp,.zip";
    }
    return ".tif,.img";
  };

  const renderSubtypeButtons = (options) => {
    return (
      <div className="flex space-x-4 mt-4">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setSelectedSubtype(option.value);
              setUploadError(null);
              setUploadProgress(0);
              setValidationResults(null);
            }}
            className={`px-4 py-2 rounded-md ${
              selectedSubtype === option.value
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  };

  const renderUploadUI = () => (
    <div className="border-2 border-blue-500 border-dashed p-4 rounded-lg mt-4 text-center">
      <input
        type="file"
        className="hidden"
        id="fileUpload"
        onChange={handleFileUpload}
        accept={getAcceptedFileTypes()}
      />
      <label
        htmlFor="fileUpload"
        className={`cursor-pointer ${
          isUploading ? "bg-gray-400" : "bg-blue-500"
        } text-white px-4 py-2 rounded-md inline-block`}
      >
        {isUploading ? "Subiendo..." : "Selecciona tu archivo"}
      </label>
      {selectedSubtype === "gdb" && (
        <p className="text-sm text-gray-600 mt-2">
          Nota: Para archivos GDB, por favor súbelos como ZIP
        </p>
      )}
      {isUploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {uploadProgress}% completado
          </p>
        </div>
      )}
      {uploadError && (
        <SimpleAlert variant="error">
          <p>{uploadError}</p>
        </SimpleAlert>
      )}
      <p className="text-gray-500 mt-2">
        Arrastra o selecciona aquí tu archivo
        {selectedSubtype === "gdb" ? " (ZIP)" : ""}
      </p>
      {validationResults && <ValidationResults results={validationResults} />}
    </div>
  );

  if (selectedType === "Vector") {
    const vectorOptions = [
      { value: "gdb", label: "GDB" },
      { value: "polygon", label: "Polígono" },
      { value: "line", label: "Línea" },
      { value: "point", label: "Punto" },
    ];

    return (
      <div className="mt-4">
        <label className="block mb-2">Sube tu vector:</label>
        {renderSubtypeButtons(vectorOptions)}
        {selectedSubtype && renderUploadUI()}
      </div>
    );
  }

  if (selectedType === "Raster") {
    const rasterOptions = [
      { value: "dtm", label: "Modelo Digital del Terreno" },
      { value: "orthoimage", label: "Ortoimagen" },
    ];

    return (
      <div className="mt-4">
        <label className="block mb-2">Sube el Ráster:</label>
        {renderSubtypeButtons(rasterOptions)}
        {selectedSubtype && renderUploadUI()}
      </div>
    );
  }

  if (selectedType === "Geoservicio") {
    const geoserviceOptions = [
      { value: "wfs", label: "WFS" },
      { value: "wms", label: "WMS" },
      { value: "wmts", label: "WMTS" },
    ];

    return (
      <div className="mt-4">
        <label className="block mb-2">Ingresa el link del geoservicio:</label>
        {renderSubtypeButtons(geoserviceOptions)}
        {selectedSubtype && (
          <input
            type="text"
            placeholder="Ejemplo: www.migeoservicio.com/endpoint"
            className="border-2 border-gray-300 rounded-md w-full mt-4 p-2"
          />
        )}
      </div>
    );
  }

  return null;
};

export default DataUpload;
