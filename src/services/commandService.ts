export function processCommand(command: string): {
  action: string;
  url?: string;
  isBrowserAction: boolean;
} {
  const lowerCmd = command.toLowerCase().trim();

  // 1. JSON Command Parsing (Supports complete, truncated, or incomplete JSON patterns)
  if (command.trim().startsWith("{") || command.includes('"action"') || command.includes("play_music")) {
    try {
      const actionMatch = command.match(/"action"\s*:\s*"([^"]+)"/);
      const action = actionMatch ? actionMatch[1] : (command.includes("play_music") ? "play_music" : "");
      
      if (action === "play_music") {
        let songName = "";
        const fullSongMatch = command.match(/"song"\s*:\s*"([^"]+)"/);
        if (fullSongMatch) {
          songName = fullSongMatch[1].trim();
        } else {
          const partialSongMatch = command.match(/"song"\s*:\s*"?([^"\}]+)/);
          if (partialSongMatch) {
            songName = partialSongMatch[1].replace(/[:",]/g, "").trim();
          }
        }

        if (songName) {
          const query = encodeURIComponent(songName);
          return {
            action: `Playing "${songName}" on YouTube. Sit back and enjoy, Boss!`,
            url: `https://www.youtube.com/results?search_query=${query}`,
            isBrowserAction: true,
          };
        } else {
          return {
            action: "Arey Boss, you didn't tell me which song to play! Just type or say the song name and I'll find it for you.",
            isBrowserAction: true,
          };
        }
      }
    } catch (e) {
      console.error("Failed to process JSON command:", e);
    }
  }

  // 2. Natural language "play [song]" (fallback to YouTube)
  if (lowerCmd.startsWith("play ") && !lowerCmd.endsWith("on youtube") && !lowerCmd.endsWith("on spotify")) {
    const song = command.substring(5).trim();
    if (song) {
      const query = encodeURIComponent(song);
      return {
        action: `Playing "${song}" on YouTube. Sahi choice hai, Boss!`,
        url: `https://www.youtube.com/results?search_query=${query}`,
        isBrowserAction: true,
      };
    }
  }

  // Google Maps Commands
  if (
    lowerCmd === "open map" || 
    lowerCmd === "open maps" || 
    lowerCmd === "open google maps" || 
    lowerCmd === "google maps" || 
    lowerCmd === "maps" || 
    lowerCmd === "map"
  ) {
    return {
      action: "Opening Google Maps for you, Boss!",
      url: "https://www.google.com/maps",
      isBrowserAction: true,
    };
  }

  const mapsSearchMatch = lowerCmd.match(/^(?:search|show|find)\s+(.+?)\s+on\s+(?:google\s+)?maps?$/);
  if (mapsSearchMatch) {
    const query = encodeURIComponent(mapsSearchMatch[1].trim());
    return {
      action: `Finding ${mapsSearchMatch[1]} on Google Maps...`,
      url: `https://www.google.com/maps/search/?api=1&query=${query}`,
      isBrowserAction: true,
    };
  }

  // General Browsing: "Open [website name]"
  const openMatch = lowerCmd.match(/^open\s+(.+)$/);
  if (
    openMatch &&
    !lowerCmd.includes("youtube") &&
    !lowerCmd.includes("spotify") &&
    !lowerCmd.includes("map")
  ) {
    const rawTarget = openMatch[1].trim();
    let url = "";
    if (rawTarget.includes(":/") || rawTarget.includes(":")) {
      url = rawTarget;
    } else {
      let website = rawTarget.replace(/\s+/g, "");
      if (!website.includes(".")) {
        website += ".com";
      }
      url = `https://www.${website}`;
    }
    return {
      action: `Opening ${openMatch[1]} for you, ugh.`,
      url: url,
      isBrowserAction: true,
    };
  }

  // Media Search: "Play / Search [song/video] on YouTube"
  const ytMatch = lowerCmd.match(/^(?:play|search)\s+(.+?)\s+on\s+youtube$/);
  if (ytMatch) {
    const query = encodeURIComponent(ytMatch[1].trim());
    return {
      action: `Playing ${ytMatch[1]} on YouTube. Don't judge my music taste.`,
      url: `https://www.youtube.com/results?search_query=${query}`,
      isBrowserAction: true,
    };
  }

  // Media Search: "Search / Play [query] on Spotify"
  const spotifyMatch = lowerCmd.match(/^(?:play|search)\s+(.+?)\s+on\s+spotify$/);
  if (spotifyMatch) {
    const query = encodeURIComponent(spotifyMatch[1].trim());
    return {
      action: `Playing ${spotifyMatch[1]} on Spotify. Hope it's a banger.`,
      url: `https://open.spotify.com/search/${query}`,
      isBrowserAction: true,
    };
  }

  // WhatsApp Web: "Send a WhatsApp message to [number] saying [message]"
  const waMatch = lowerCmd.match(
    /^send\s+a\s+whatsapp\s+message\s+to\s+([\d\+\s]+)\s+saying\s+(.+)$/,
  );
  if (waMatch) {
    const number = waMatch[1].replace(/\s+/g, "");
    const message = encodeURIComponent(waMatch[2].trim());
    return {
      action: `Sending your message. Let's hope they reply, Boss.`,
      url: `https://web.whatsapp.com/send?phone=${number}&text=${message}`,
      isBrowserAction: true,
    };
  }

  // Call / Dial Dialer: "Call [number]" or "Dial [number]"
  const callMatch = lowerCmd.match(/^(?:call|dial)\s+([\d\+\s]+)$/);
  if (callMatch) {
    const number = callMatch[1].replace(/\s+/g, "");
    return {
      action: `Opening phone dialer for ${callMatch[1]}...`,
      url: `tel:${number}`,
      isBrowserAction: true,
    };
  }

  return { action: "", isBrowserAction: false };
}
