# What is this?

A little "monorepo" (Google it). Since all the json-client convenience wrappers
are directly dependent on the versions of json-client, it's easier to keep them in the same repository.

Each wrapper reduces the effort of using json-client by providing the necessary
fetch implementation transparently. Currently there is only one wrapper - for
Node JS - because it should work in other scenarios with no additional effort.
