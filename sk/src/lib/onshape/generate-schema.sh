npx openapi-typescript https://api.onshape.com/api/v16/openapi -o ./schema.d.ts --make-paths-enum --array-length --properties-required-by-default

# hack time!

# replace lines with "            default: {" with "            200: {" because some part of this stack messes
# up response types...
sed -i 's/^            default: {/            200: {/' ./schema.d.ts
# ...and replace all lines that match "^                "application/json;charset=UTF-8; qs=0.09": (.*);$"
# with "                "application/json;charset=UTF-8; qs=0.09": Partial<\1>;"
# we use --properties-required-by-default to get around some optional property annoyingness, but it messes up
# request body types because all fields are actually optional so we adjust here.
sed -i 's/^                "application\/json;charset=UTF-8; qs=0.09": \(.*\);$/                "application\/json;charset=UTF-8; qs=0.09": Partial<\1>;/' ./schema.d.ts
