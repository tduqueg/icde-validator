import { useState } from 'react';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import JSZip from "jszip";

console.log(process.env.REACT_APP_AWS_SECRET_ACCESS_KEY); // Para verificar que se lee correctamente
console.log(process.env.REACT_APP_AWS_ACCESS_KEY_ID); // Para verificar que se lee correctamente
console.log(process.env.REACT_APP_AWS_SESSION_TOKEN); // Para verificar que se lee correctamente

// Configuración del cliente S3 específica para AWS Academy
const s3Client = new S3Client({
  region: 'us-east-1', 
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.REACT_APP_AWS_SESSION_TOKEN 
  }
});

const DataUpload = ({ selectedType }) => {
  const [selectedSubtype, setSelectedSubtype] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const uploadToS3 = async (file) => {
    try {
      const fileExtension = file.name.split('.').pop();
      const timestamp = Date.now();
      const uniqueFileName = `files/${selectedType.toLowerCase()}/${selectedSubtype}/${timestamp}_${file.name}`;
      const bucketName = 'proyecto-icdc'; 

      const uploadParams = {
        Bucket: bucketName,
        Key: uniqueFileName,
        Body: file,
        ContentType: file.type,
      };

      console.log('Iniciando subida a S3 con parámetros:', {
        bucket: bucketName,
        key: uniqueFileName,
        contentType: file.type
      });

      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);
      console.log('Archivo subido exitosamente a S3');
      return `s3://${bucketName}/${uniqueFileName}`;
    } catch (error) {
      console.error('Error detallado de S3:', error);
      if (error.name === 'CredentialsProviderError') {
        throw new Error('Error de credenciales de AWS Academy. Verifica que el sessionToken esté actualizado.');
      }
      throw new Error(`Error en la subida a S3: ${error.message}`);
    }
  };

  const handleGDBUpload = async (file) => {
    if (file.type === 'application/x-zip-compressed' || file.type === 'application/zip') {
      try {
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(file);
        const entries = Object.keys(zipContents.files);
        
        // Buscar la carpeta GDB de manera más flexible
        const gdbFolder = entries.find(entry => {
          const normalizedEntry = entry.toLowerCase();
          return normalizedEntry.includes('.gdb/') || 
                 normalizedEntry.includes('.gdb\\') ||
                 normalizedEntry.endsWith('.gdb');
        });

        if (!gdbFolder) {
          console.log('Entradas encontradas en el ZIP:', entries);
          throw new Error('No se encontró una carpeta GDB válida en el archivo ZIP.');
        }

        // Obtener la base del nombre de la carpeta GDB
        const gdbBase = gdbFolder.split('/')[0];
        console.log('Carpeta GDB base encontrada:', gdbBase);
        
        // Buscar archivos dentro de la carpeta GDB
        const filesInGdb = entries.filter(entry => 
          entry.startsWith(gdbBase) && !entry.endsWith('/')
        );
        console.log('Archivos encontrados en la carpeta GDB:', filesInGdb);

        if (filesInGdb.length === 0) {
          throw new Error('La carpeta GDB está vacía o no contiene archivos válidos.');
        }

        // Verificar las extensiones esenciales
        const essentialExtensions = ['.gdbtable', '.gdbindexes', '.gdbtablx'];
        const containsEssentialFiles = filesInGdb.some(filename =>
          essentialExtensions.some(ext => filename.toLowerCase().endsWith(ext))
        );

        if (!containsEssentialFiles) {
          throw new Error('La carpeta GDB no contiene los archivos esenciales necesarios.');
        }

        console.log('Validación de GDB exitosa, procediendo a subir a S3');
        return await uploadToS3(file);
      } catch (error) {
        console.error('Error en el procesamiento del GDB:', error);
        throw new Error(`Error procesando el archivo: ${error.message}`);
      }
    } else {
      throw new Error('Por favor, sube un archivo ZIP que contenga una carpeta GDB válida.');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      let s3Uri;
      console.log('Iniciando proceso de subida para:', file.name);
      
      if (selectedSubtype === 'gdb') {
        s3Uri = await handleGDBUpload(file);
      } else {
        s3Uri = await uploadToS3(file);
      }

      const dataType = selectedType === "Vector" ? 1 : 2;

      // POST al endpoint con la URI de S3
      const response = await fetch('http://dominio:8000/process-data/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data_type: dataType,
          s3_bucket_uri: s3Uri
        })
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }

      setUploadProgress(100);
      console.log('Proceso completado exitosamente');
    } catch (error) {
      console.error('Error durante la subida:', error);
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
            }}
            className={`px-4 py-2 rounded-md ${
              selectedSubtype === option.value ? "bg-blue-500 text-white" : "bg-gray-200"
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
          isUploading ? 'bg-gray-400' : 'bg-blue-500'
        } text-white px-4 py-2 rounded-md`}
      >
        {isUploading ? 'Subiendo...' : 'Selecciona tu archivo'}
      </label>
      {selectedSubtype === 'gdb' && (
        <p className="text-sm text-gray-600 mt-2">
          Nota: Para archivos GDB, por favor súbelos como ZIP
        </p>
      )}
      {isUploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">{uploadProgress}% completado</p>
        </div>
      )}
      {uploadError && (
        <p className="text-red-500 mt-2">{uploadError}</p>
      )}
      <p className="text-gray-500 mt-2">
        Arrastra o selecciona aquí tu archivo
        {selectedSubtype === 'gdb' ? ' (ZIP)' : ''}
      </p>
    </div>
  );

  if (selectedType === "Vector") {
    const vectorOptions = [
      { value: "gdb", label: "GDB" },
      { value: "polygon", label: "Polígono" },
      { value: "line", label: "Línea" },
      { value: "point", label: "Punto" }
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
      { value: "orthoimage", label: "Ortoimagen" }
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
      { value: "wmts", label: "WMTS" }
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