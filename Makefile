IMAGE ?= registry.biergartenrajis.fi/makihyppy:latest
CONTAINER ?= makihyppy
PORT ?= 8877

.PHONY: build start stop remove restart logs shell status test coverage e2e

build:
	docker build --tag $(IMAGE) .

start: build
	-docker rm --force $(CONTAINER)
	docker run --detach --name $(CONTAINER) --publish $(PORT):8877 $(IMAGE)

stop:
	-docker stop $(CONTAINER)

remove:
	-docker rm --force $(CONTAINER)

restart: stop start

logs:
	docker logs --follow $(CONTAINER)

shell:
	docker exec --interactive --tty $(CONTAINER) /bin/sh

status:
	docker ps --filter name=$(CONTAINER)

push:
	docker push $(IMAGE)

test:
	python3 -m unittest discover -s tests -v

coverage:
	python3 -m coverage run -m unittest discover -s tests -v
	python3 -m coverage report --fail-under=90

e2e:
	npm run test:e2e
