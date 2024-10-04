.PHONY: *

SHELL = /bin/sh

CURRENT_UID := $(shell id -u)
CURRENT_GID := $(shell id -g)

LANG := $(subst doc-,,$(shell basename ${PWD}))

#
# If doc-base, en, or phd exist as siblings to the current directory,
# add those as volumes to our Docker runs.
#

PATHS := -v .:/var/www/${LANG}
ifneq ($(wildcard ../doc-base/LICENSE),)
	PATHS += -v ${PWD}/../doc-base:/var/www/doc-base
endif
ifneq ($(wildcard ../phd/LICENSE),)
	PATHS += -v ${PWD}/../phd:/var/www/phd
endif
ifneq (${LANG},en)
	ifneq ($(wildcard ../en/README.md),)
		PATHS += -v ${PWD}/../en:/var/www/en
	endif
endif

xhtml: .docker/built
	docker run ${PATHS} -w /var/www -u ${CURRENT_UID}:${CURRENT_GID} \
		-e LANG=${LANG} php/doc-build

php: .docker/built
	docker run ${PATHS} -w /var/www -u ${CURRENT_UID}:${CURRENT_GID} \
		-e LANG=${LANG} -e FORMAT=php php/doc-build

build: .docker/built

.docker/built:
	docker build .docker -t php/doc-build
	touch .docker/built
