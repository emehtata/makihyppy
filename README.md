# Makihyppy for Spectravideo

A small preservation and browser-port workspace for **Makihyppy**, a Finnish ski-jump game recovered from a Spectravideo SVI-328 cassette image.

## Contents

- `data/` contains preserved cassette images and archive metadata.
- `extract_svi_basic.py` extracts tokenized SVI/MSX BASIC from `.cas` images.
- `web/` is a dependency-free HTML5 Canvas browser port with practice and competition modes.
- `k8s/` contains a Kubernetes Deployment and `LoadBalancer` Service.

## Extract BASIC

```sh
python3 extract_svi_basic.py data/makihyppy.cas data/makihyppy.bas
```

## Run locally

Open `web/index.html` directly in a browser, or serve the port with Python:

```sh
cd web
python3 -m http.server 8877
```

The browser game controls are:

- `Space`: begin the approach and take off near the end of the ramp.
- `A` / `D`: adjust ski angle during flight.

## Container image

The container serves the game on port `8877`.

```sh
make build
make start
make status
make logs
make stop
make remove
```

The default image is the local `makihyppy:latest` tag. Set `IMAGE` to your
private registry image when building or pushing:

```sh
make build IMAGE=registry.example.com/makihyppy:latest
make push IMAGE=registry.example.com/makihyppy:latest
```

`build_web_version.py` writes `web/version.js` during the image build. The displayed version remains stable until the browser source changes.

## Kubernetes

The manifests expect the `makihyppy` namespace. Before applying them, replace
`registry.example.com/makihyppy:latest` in `k8s/deployment.yaml` with your image:

```sh
kubectl create namespace makihyppy
kubectl apply -f k8s/
kubectl get service -n makihyppy makihyppy
```

The Service is type `LoadBalancer` on port `8877`, ready to be reached by an external reverse proxy or a load-balancer implementation provided by the cluster.

## License and Attribution

The Python extractor, browser port, container configuration, and Kubernetes manifests are licensed under the [MIT License](LICENSE).

The cassette images in `data/` are preserved source artifacts and are not relicensed by this repository. The extracted Makihyppy BASIC listing credits its original author, Anssi Pulkkinen (1984).
