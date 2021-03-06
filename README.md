# Willog

Powered by [Hexo](http://hexo.io)

# Features

* Mobile friendly responsive type scale
* Geolocation Supported

# Getting started

* Create a new repo for your project on Github
* In terminal run
```bash
    git clone git@github.com:willin/now.git [yourNewRepoName]
    cd [yourNewRepoName]
    rm -rf .git
    git init
    git remote add origin git@github.com:[yourUserName]/[yourNewRepoName].git
    git remote -v
```

gitcafe.com also can be used instead of github.com 


* git remote -v will allow you to check that you have changed the remote origin correctly. The output should look like:
```bash
    origin git@github.com:[yourUserName]/[yourNewRepoName].git (fetch)
    origin  git@github.com:[yourUserName]/[yourNewRepoName].git (push)
```

* Once you add & commit files you are ready to publish run:
```bash
git push -u origin master
```

# Getting going

```
  cd [repo]
  gem install foreman
  foreman start
```

Now go to http://localhost:4000 and see Hello World.

# Author

[Willin Wang](http://willin.wang)

# License

The MIT License (MIT)

Copyright (c) 2014 @willin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
