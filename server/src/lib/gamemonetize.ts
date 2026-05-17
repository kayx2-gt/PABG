export async function fetchGamesFromAPI(category = '0', num = 20, page = 1) { 
  const url = `https://gamemonetize.com/feed.php?format=0&num=${num}&page=${page}&category=${category}`; 
  const data = await fetch(url).then(r => r.json()); 
  return (data as any[]).map((item: any) => {
    const urlParts = item.url.split('/');
    const token = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
    
    return {
      title: item.title, 
      thumbnail: item.thumb, 
      gameUrl: item.url, 
      category: item.category, 
      description: item.description, 
      tags: item.tags, 
      videoUrl: `https://gamemonetize.video/index.php?domain=gamemonetize.com&gameid=${token}&getads=true&referer=original`,
      gameMonetizeId: item.id,
      isNew: false, 
      isFeatured: false, 
    };
  }); 
}
