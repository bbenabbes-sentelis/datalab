# Copyright 2015 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# We use different base images for GPU vs CPU Dockerfiles, so we expect
# that the appropriate image is pulled and tagged locally.
# CPU should use ubuntu:16.04
# and GPU uses nvidia/cuda:9.1-cudnn7-devel-ubuntu16.04
FROM datalab-external-base-image
MAINTAINER Google Cloud DataLab

# Container configuration
EXPOSE 8080

# Path configuration
ENV DATALAB_CONDA_DIR /usr/local
ENV PATH $PATH:/tools/node/bin:/tools/google-cloud-sdk/bin:$DATALAB_CONDA_DIR/bin

ENV PYTHON_3_ENV py3env

# Needed to run "source" for switching Conda environments.
SHELL ["/bin/bash", "-c"]

# Setup OS and core packages
RUN sed -i~orig -e 's/# deb-src/deb-src/' /etc/apt/sources.list && \
    apt-get update -y && \
    apt-get install -y --no-install-recommends -q debian-archive-keyring debian-keyring && \
    apt-get update -y --no-install-recommends && \
    apt-get install --no-install-recommends -y --allow-unauthenticated -q \
        build-essential \
        ca-certificates \
        curl \
        git \
        libpng-dev \
        locales \
        openssh-client \
        pkg-config \
        unzip \
        wget \
        zip && \
    mkdir -p /tools && \
# Save GPL source packages
    mkdir -p /srcs && \
    cd /srcs && \
    apt-get source -d wget git python-zmq ca-certificates pkg-config && \
    cd / && \
# Set our locale to en_US.UTF-8.
    locale-gen en_US.UTF-8 && \
    update-locale LANG=en_US.UTF-8 && \
# Install MiniConda, set up Python 2.7 Conda env, and install packages.
    wget --quiet -O ~/miniconda.sh \
    http://repo.continuum.io/miniconda/Miniconda-latest-Linux-x86_64.sh && \
    chmod +x ~/miniconda.sh && \
    ~/miniconda.sh -b -f -p $DATALAB_CONDA_DIR && \
    rm ~/miniconda.sh && \
    conda update conda --quiet --yes && \
    conda config --system --append channels conda-forge && \
    conda config --system --set show_channel_urls true && \
    conda update --all --quiet --yes && \
# Clean up before setting up the Python3 env.
    conda clean -tipsy && \
# This var needs to be unset before installing the Python3 Conda env to
# avoid subtle dependency issues.
    unset OLDPWD && \
# Set up Python 3.5 Conda env and install packages.
    conda create --yes --quiet --name $PYTHON_3_ENV python=3.5 \
        widgetsnbextension==3.2.1 \
        pip==18.0 && \
# Make pip3 a copy of pip for the Python 3 environment.
    cp /usr/local/envs/py3env/bin/pip /usr/local/envs/py3env/bin/pip3 && \
    source deactivate && \
# Clean up Python packages
    conda clean -tipsy && \
# Delete tests directories, except for h5py since importing it takes a
# dependency on it's tests directory.
    find $DATALAB_CONDA_DIR/envs/*/lib -type d -name tests | grep -v h5py | xargs rm -rf && \
# Setup Node.js using LTS 6.10
    cd / && \
    mkdir -p /tools/node && \
    wget -nv https://nodejs.org/dist/v6.10.0/node-v6.10.0-linux-x64.tar.gz -O node.tar.gz && \
    tar xzf node.tar.gz -C /tools/node --strip-components=1 && \
    rm node.tar.gz && \
# Setup Google Cloud SDK
# Also apply workaround for gsutil failure brought by this version of Google Cloud.
# (https://code.google.com/p/google-cloud-sdk/issues/detail?id=538) in final step.
    wget -nv https://dl.google.com/dl/cloudsdk/release/google-cloud-sdk.zip && \
    unzip -qq google-cloud-sdk.zip -d tools && \
    rm google-cloud-sdk.zip && \
    tools/google-cloud-sdk/install.sh --usage-reporting=false \
        --path-update=false --bash-completion=false \
        --disable-installation-options && \
    tools/google-cloud-sdk/bin/gcloud -q components update \
        gcloud core bq gsutil compute preview alpha beta && \
# Disable the gcloud update message
    tools/google-cloud-sdk/bin/gcloud config set component_manager/disable_update_check true && \
    touch /tools/google-cloud-sdk/lib/third_party/google.py && \
# Add some unchanging bits - specifically node modules (that need to be kept in sync
# with packages.json manually, but help save build time, by preincluding them in an
# earlier layer).
    /tools/node/bin/npm install \
        bunyan@1.7.1 \
        http-proxy@1.13.2 \
        mkdirp@0.5.1 \
        node-cache@3.2.0  \
        node-uuid@1.4.7 \
        tcp-port-used@0.1.2 \
        ws@1.1.4 && \
    cd / && \
    /tools/node/bin/npm install -g forever && \
# Clean up
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/* && \
    rm -rf /root/.cache/* && \
    rm -rf /usr/share/locale/* && \
    rm -rf /usr/share/i18n/locales/*

ENV LANG en_US.UTF-8

# Copy local configuration files
COPY config/ipython.py /etc/ipython/ipython_config.py
COPY config/nbconvert.py /etc/jupyter/jupyter_notebook_config.py

# Directory "py" may be empty and in that case it will git clone pydatalab from repo
COPY pydatalab /datalab/lib/pydatalab
COPY nbconvert /datalab/nbconvert

RUN if [ -d /datalab/lib/pydatalab/.git ]; then \
        echo "use local lib"; \
    else \
        git clone https://github.com/googledatalab/pydatalab.git /datalab/lib/pydatalab; \
    fi && \
    cd /datalab/lib/pydatalab && \
    /tools/node/bin/npm install -g typescript@3.0.3 && \
    tsc --module amd --noImplicitAny --outdir datalab/notebook/static datalab/notebook/static/*.ts && \
    tsc --module amd --noImplicitAny --outdir google/datalab/notebook/static google/datalab/notebook/static/*.ts && \
    /tools/node/bin/npm uninstall -g typescript && \
    cd /datalab/lib/pydatalab && \
# Install Python3 pydatalab packages and Jupyter extensions. The Datalab web app
# will also be started from the Python3 env.
    source activate $PYTHON_3_ENV && \
    pip install --upgrade-strategy only-if-needed --no-cache-dir . && \
    pip install --upgrade-strategy only-if-needed /datalab/lib/pydatalab/solutionbox/image_classification/. && \
    pip install --upgrade-strategy only-if-needed /datalab/lib/pydatalab/solutionbox/structured_data/. && \
    pip install --upgrade-strategy only-if-needed jupyter_highlight_selected_word==0.2.0 && \
    jupyter nbextension install --py datalab.notebook && \
    jupyter nbextension install --py google.datalab.notebook && \
    jupyter nbextension install --py jupyter_highlight_selected_word && \
    jupyter nbextension enable --sys-prefix --py jupyter_highlight_selected_word && \
    jupyter nbextension enable --sys-prefix --py widgetsnbextension && \
    source deactivate && \
# Clean up
    rm datalab/notebook/static/*.js google/datalab/notebook/static/*.js && \
# Set up correct paths for nbconvert
    mkdir -p /datalab/nbconvert && \
    cp -R /usr/local/share/jupyter/nbextensions/gcpdatalab/* /datalab/nbconvert && \
    ln -s $DATALAB_CONDA_DIR/envs/$PYTHON_3_ENV/lib/python3.5/site-packages/notebook/static/custom/custom.css /datalab/nbconvert/custom.css

COPY config/py3-kernel.json $DATALAB_CONDA_DIR/envs/$PYTHON_3_ENV/share/jupyter/kernels/python3/kernel.json
COPY config/py3-kernel-startup.sh $DATALAB_CONDA_DIR/envs/$PYTHON_3_ENV/share/jupyter/kernels/python3/kernel-startup.sh

RUN chmod 755 $DATALAB_CONDA_DIR/envs/$PYTHON_3_ENV/share/jupyter/kernels/python3/kernel-startup.sh
