  // Sync Audio Engine when tracks change
  useEffect(() => {
    if (tracks.length > 0) {
      audioEngineRef.current.initializeTracks(tracks);
      console.log('🔄 Audio Engine synced with tracks');
    }
  }, [tracks]);
