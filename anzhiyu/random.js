var posts=["2024/04/29/first_passage/","2024/05/04/game/","2024/05/06/github/","2024/05/04/gitone/","2024/04/20/hello-world/","2024/05/13/suanfa1/","2024/05/15/suanfa2/","2024/05/16/suanfa3/","2024/05/18/suanfa4/","2024/05/18/suanfa5/"];function toRandomPost(){
    pjax.loadUrl('/'+posts[Math.floor(Math.random() * posts.length)]);
  };