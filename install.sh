git submodule update --init
cd grafana
npm install
npm install -g grunt-cli
grunt
grunt build
cd ..
npm install
ln -s `pwd`/render/ `pwd`/grafana/dist/app/panels/render
