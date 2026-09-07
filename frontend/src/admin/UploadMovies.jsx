import React from "react";
import TopNavbar from '../components/TopNavbar.jsx';
const UploadMovies = () => {
    return (
        <>
        <div> 
          <TopNavbar />
          <div className="mt-16 p-4">
            <h1 className="text-2xl font-bold mb-4">Upload Movies</h1>
            <form className="mb-8">
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="title">Movie Title</label>
                <input className="w-full px-3 py-2 border rounded" type="text" id="title" name="title" required />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="description">Description</label>
                <textarea className="w-full px-3 py-2 border rounded" id="description" name="description" required></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="file">Movie File</label>
                <input className="w-full px-3 py-2 border rounded" type="file" id="file" name="file" accept="video/*" required />
              </div>
              <button className="bg-blue-500 text-white px-4 py-2 rounded" type="submit">Upload Movie</button>
            </form>
          </div>
          
        </div>
        </>
    );
};

export default UploadMovies;