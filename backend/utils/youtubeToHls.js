// const youtubedl = require("yt-dlp-exec");

// const ffmpeg = require("fluent-ffmpeg");

// const ffmpegPath = require("ffmpeg-static");

// const path = require("path");


// // use ffmpeg-static
// ffmpeg.setFfmpegPath(ffmpegPath);


// const convertYoutubeToHLS = async (
//     youtubeUrl,
//     outputDir
// ) => {

//     try {

//         console.log(
//             "📥 Downloading video..."
//         );

//         // temp mp4 path
//         const outputFile = path.join(
//             outputDir,
//             "video.mp4"
//         );

//         // download video
//         await youtubedl(youtubeUrl, {

//             output: outputFile,

//             format: "best"

//         });

//         console.log(
//             "✅ Download complete"
//         );

//         console.log(
//             "🎞️ Converting to HLS..."
//         );

//         // convert mp4 → m3u8
//         return new Promise((resolve, reject) => {

//             ffmpeg(outputFile)

//                 .outputOptions([

//                     "-profile:v baseline",

//                     "-level 3.0",

//                     "-start_number 0",

//                     "-hls_time 10",

//                     "-hls_list_size 0",

//                     "-f hls"

//                 ])

//                 .output(
//                     path.join(
//                         outputDir,
//                         "index.m3u8"
//                     )
//                 )

//                 .on("end", () => {

//                     console.log(
//                         "✅ HLS Ready"
//                     );

//                     resolve();

//                 })

//                 .on("error", (err) => {

//                     console.log(err);

//                     reject(err);

//                 })

//                 .run();

//         });

//     }

//     catch (err) {

//         console.log(err);

//         throw err;

//     }

// };

// module.exports = convertYoutubeToHLS;