var posts=["2024/04/29/first_passage/","2024/04/29/game/","2025/04/30/hello-world/"];function toRandomPost(){
    pjax.loadUrl('/'+posts[Math.floor(Math.random() * posts.length)]);
  };