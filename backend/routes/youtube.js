const express = require("express");

const axios = require("axios");

const router = express.Router();

router.get("/video/:id", async (req, res) => {

    try {

        const videoId = req.params.id;

        // youtube api
        const response = await axios.get(
            "https://www.googleapis.com/youtube/v3/videos",
            {
                params: {
                    part: "snippet",
                    id: videoId,
                    key: process.env.YOUTUBE_API_KEY
                }
            }
        );

        const video = response.data.items[0];

        res.json({

            success: true,

            title: video.snippet.title,

            embedUrl:
                `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0`

        });

    }

    catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

});

module.exports = router;