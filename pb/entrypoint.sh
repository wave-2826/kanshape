#!/bin/sh
set -e # exit on any non-zero status (error)

# this entrypoint script checks that all required setup is done.
# If not done, does it.
# And then proceeds to execute the main "command" for this container.
DIR=$(dirname $0)
cd $DIR
PB_VERSION=${PB_VERSION:-"0.27.2"}
PB_ARCH=${PB_ARCH:-"linux_amd64"}
CMD=$@

CMD=${CMD:-"./pocketbase serve --dev --http 0.0.0.0:8090 --publicDir ../sk/build"}
if [ ! -x "pocketbase" ] || [ "`./pocketbase --version`" != "pocketbase version $PB_VERSION" ]; then
  echo "Fetching Pocketbase version: $PB_VERSION, architecture: $PB_ARCH"

  url="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${PB_ARCH}.zip"
  wget -q "$url" -O /tmp/pb.zip
  unzip -o /tmp/pb.zip pocketbase
fi

exec $CMD