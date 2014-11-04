git submodule update --init
cd grafana
npm install
npm install -g grunt-cli
grunt
grunt build
cd ..
npm install
ln -s `pwd`/render/ `pwd`/grafana/dist/app/panels/render
cp `pwd`/config/config.grafana.js `pwd`/grafana/dist/config.js
cp `pwd`/config/serverconfig.sample.js `pwd`/config/serverconfig.js
if [ ! -f `pwd`/server/projects.json ]; then
  echo "{}" > `pwd`/server/projects.json
fi