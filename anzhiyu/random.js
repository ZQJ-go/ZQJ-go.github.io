var posts=["2021/04/06/first/","2025/04/22/hello-world/","2025/04/22/second/"];function toRandomPost(){
    pjax.loadUrl('/'+posts[Math.floor(Math.random() * posts.length)]);
  };