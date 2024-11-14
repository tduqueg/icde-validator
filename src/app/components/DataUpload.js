// components/DataUpload.js
const DataUpload = ({ selectedType }) => {
  if (selectedType === "Vector") {
    return (
      <div className="mt-4">
        <label className="block mb-2">Sube tus vectores:</label>
        <div className="flex space-x-4">
          <input type="checkbox" id="gdb" />
          <label htmlFor="gdb">GDB</label>
          <input type="checkbox" id="polygon" />
          <label htmlFor="polygon">Polígono</label>
          <input type="checkbox" id="line" />
          <label htmlFor="line">Línea</label>
          <input type="checkbox" id="point" />
          <label htmlFor="point">Punto</label>
        </div>
        <div className="border-2 border-blue-500 border-dashed p-4 rounded-lg mt-4 text-center">
          <input type="file" multiple className="hidden" id="vectorFiles" />
          <label
            htmlFor="vectorFiles"
            className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Selecciona tus archivos
          </label>
          <p className="text-gray-500 mt-2">
            Arrastra o selecciona aquí tus archivos
          </p>
        </div>
      </div>
    );
  }

  if (selectedType === "Raster") {
    return (
      <div className="mt-4">
        <label className="block mb-2">Sube el Ráster:</label>
        <div className="flex space-x-4">
          <input type="checkbox" id="dtm" />
          <label htmlFor="dtm">Modelo Digital del Terreno</label>
          <input type="checkbox" id="orthoimage" />
          <label htmlFor="orthoimage">Ortoimagen</label>
        </div>
        <div className="border-2 border-blue-500 border-dashed p-4 rounded-lg mt-4 text-center">
          <input type="file" multiple className="hidden" id="rasterFiles" />
          <label
            htmlFor="rasterFiles"
            className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Selecciona tus archivos
          </label>
          <p className="text-gray-500 mt-2">
            Arrastra o selecciona aquí tus archivos
          </p>
        </div>
      </div>
    );
  }

  if (selectedType === "Geoservicio") {
    return (
      <div className="mt-4">
        <label className="block mb-2">Ingresa el link del geoservicio:</label>
        <div className="flex space-x-4">
          <input type="checkbox" id="wfs" />
          <label htmlFor="wfs">WFS</label>
          <input type="checkbox" id="wms" />
          <label htmlFor="wms">WMS</label>
          <input type="checkbox" id="wmts" />
          <label htmlFor="wmts">WMTS</label>
        </div>
        <input
          type="text"
          placeholder="Ejemplo: www.migeoservicio.com/endpoint"
          className="border-2 border-gray-300 rounded-md w-full mt-4 p-2"
        />
      </div>
    );
  }

  return null;
};

export default DataUpload;
