import React, { useState, useEffect, useMemo } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./ui/carousel";

export interface BannerAd {
  _id?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  image?: string;
  img?: string;
  url?: string;
  path?: string;
  filePath?: string;
  link?: string;
  sortOrder?: number;
  isActive?: boolean;
  position?: string;
}

interface AdvertisementBannerCarouselProps {
  onBannerClick?: (bannerType: string) => void;
}

const FALLBACKS = [
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1920&auto=format&fit=crop",

  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMTEhUSExIVFhUVFxcXGBgXFRgYFxsYGBUWGBUYFxgYHSggGBslHRcWITEhJSkrLi4uFx8zODMtNyguLisBCgoKDg0OGhAQGi0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAKgBLAMBEQACEQEDEQH/xAAcAAACAwEBAQEAAAAAAAAAAAAABQMEBgIBBwj/xABIEAACAQIEAwUDBwoEAwkAAAABAgMAEQQSITEFQVEGEyJhcTKBkRQjQqGx0fAHFRZSU2Jyk8HTM1SC8ZKy4TRDRHN0g6LC8v/EABsBAAIDAQEBAAAAAAAAAAAAAAABAgMEBQYH/8QAOhEAAgIBAwEECQUAAAQHAQAAAAECEQMEEiExE0FRYQUiMlJxgZGh0RSxweHwNEJDYiQzcqLS4vEj/9oADAMBAAIRAxEAPwD6v+leC/zMfxP3UWZf1un99B+leC/zMfxP3UWH63T++g/SvBf5mP4n7qLD9bp/fQfpXgv8zH8T91Fh+t0/voP0rwX+Zj+J+6gP1un99B+leC/zMfxP3UWH63T++iOftVgyrAYmPUHmenpQKWtwU/XR8UFB5EKBBQBvfyc9p8hGEmbwsfmmPJj9A+R5eenPQO36L1tPsZvju/B9HljvrWfNi3co9DGVFGZbVx80S9MpM9t6xQe32iyrF2KlLHQVmz53J0kXwjRCqEamnhbT5G2WIR1rp4qaK5Ec+FW1PJijRDcxZMQBWRtIfUS8Qa5qqb3DSKbJpVuPE0VyKM0eta4lMuSlPHrY1amQSNHwbg6FR4RUlGy2uDrHcMCk5abiUyiZ2QMTlqlzS4K3wWI+Fm1zVE3uKnIgdMtVRxNvkW46caVp2pIN5Tmw16sxuyNkaYJj7INaEmxp2SRxFTY1W9yZCSGGGUUKXiRTovPYCr4yVEtxDhuJMtxuOlV5MjSsLOMTLn1NZYycpcgIuJwCtsC/GigJANKHDkk1yO66h4g9UUpOkDOgtRcmKwZelCl3MEzipjCgD0UDPKBBQAUAFAH1vsF2m+Ux9zKfnoxufpr+t/ENj7jz0D1Ho7WdtHZL2l90P8ethflXJ12LYt66fsdjG74FMjXrjOSZqSIBa9VKtxLmiPFOLU8jSRKCZXw8oFT0+VRVMJxOsRLcVdkz7uEVqIvkivVNWMhn4WTVqwvqRbFs+Hy3BrRHjqVNiuYXqzqRoVYu96tSFQ/4LxchbZdqnFkZTos4nH38yajJiUkU8LCL3rJkizPlmMJSAKpSplLEM48VWSbSBck8aA1WsjZLbRBjILDSteKQbB1wfCBkFhXSxq0TSoo8awBFvWqsyISKDRFbXFc/PfcQoixGJsKWKciNFaGa9Xt8DiiycQANahCrCSKGIXvNq171FcluNlGXAG9VfqETY1rsniTtBUJN9BMGahRBI9VvjSlGvgDRy4qUWwRzUhnq0DPKBBQAUAFAE+CxbxSLLG2V0NwfxuDsRzBoLMeSWOSlHqj7V2c41HjIA4AB9mRP1W5j0O4P9b1GUVJOMuh67SalZ4Kcevf5MXcVjMTWOx1U+X315DXYZaXJtfR9H/u9HZwyU0K3nrkyzNypGhRI5HvWiLbJpHKVakyqTOnmtpU4zp0QPcKuY1phC2UtjSVAFvW3orINma4mL3qlysg3RnpUObapRnyRcidsCCNRWlSK3M6hwwGlVymUSbBogKSkQbOYpdaTkRo6xWJsN6rqx0I58UM29TaVDiifDYioRxpkmSYiTStEcdE0aPszMMluddPD7Ii/xONWWnljaIyVmd4qgC71ilBPhkdhjsc5BIJo7NRFtKsOKINjVc4ccDSLGMcsLDeqIeq7ZFjPg0TKviFLJmjLhDXBNiWGas/PcTTIq9WeLNBgzEcOqnBO7+L5xQ+pIIU5gdQDbw6DQnypHQx7HiSeNt+PP++RZhTDFgh4fNmNiBmkB2AO7aDNztz5bUE4xwt7eyd/P8lYxxCNr4GXN85Zz3gVRZshIvy8N/f6EIOMFF3id8+PyEL70o9Dnroc1ID1aBnlAgoAKACgAoAbdmeOPhJhItyp0df1l+8bg/0JoNWk1MtPk3Lp3o+xuI8VAGVro4zKw5HkfIjYj1FZdZpYanE8cvk/B+J7HT51xkg+GZDEYZo2KsNR+PhXhsmjnhyOOTqjswmpq0cMtWpV0G2es1hV74RQysyljVeODlK2JukSQz5G1rfjuLKWWcRjCwsK0zuSpFTYpxBN9azyuPUqkyKOEHWq45LZTJnWKFhpXSxq0ShGxcAb1m1HqshkpHLqTpVEcpVZ6VC1NNtgIsfPckCrbLIxK0cN6nHks2jfguAMj2vlVQWZreyoF71dCPKQRxtse4vsw1rJID/EtvrBNc+XpXssjx5YNV4c/Pu6m39E3G4yIY+GzxfQPqvi+oa/VW/B6S08+FKn4Pj9zJk0+WP/AC/TkJMSTob36VueVNdTK50+SnisKzjW9Vp2w7UzWK4c+Y5vd6VDNb6BvK7YUE1li3YmyzhIACKtnFNAhvFCSDaud2DchuRncZnVyD61tWKkV2Mq755IZ4bj+IjRUWSyrsMqnfcba0GmGrywSinwjw8cnziTvPEq5AbA+Hpa1Afqsu5SvnoeycexDAqZLqVZCLC1m32G++u+ppA9Xlaab8haxoSpGY8pgerQM8oEFABQAUAFABQBruwPaf5O/cyt8zIdzsjH6Xkp5+49bh1fRut7KWyb9V/Zn0jjXD+9W4HjXbzHT7qwa/RrPHcvaX38j1mDLsfPQzWFhua4mDSqT6G7JOi9+atK6UdBGjI8xH+bCKX6JR6CeSxXxKC1VZMSiJMiikApKSIMpcRnG3OqNRUlRCiOE1lhhplTPZD1rq4VSLItIhcCo5oJmfI7K8j2Nc546ZGJWxDXFaYRQ2JcZEBUZPmiyLK0ctqnA0Jo0rSNDhjGdGksz8iFt4VPO/Mjle3Wta4XxLoRLHZXiK4lTE988Q8DXIzRjcac1+z0rm+koTeNTi/Z6ry/r9vgasNJ0+80SwMo8Mjf6vEPr1+uvOSzRn7cV+xr2V0ZyZX2eJXHUfc23xqzG3FN4pSX+8iucFLicUzl1iI9lkPpp77XFb9N6SzwdTakvuYsugxSXqqn9jM8VkXMRcaaaV6aMlNJo4koOMmmZ7EYc3uKjKKJFnARcqpzNqPBHcaHAQgLY1z8GV3TExbxDDqX91dBZFQUKwa7p5Qk79v1m+JoHvl4h37frN8TQG+XiHft+s3xNAb5eJ40jHck+poByb6s4oInq0DPKBBQAUAFABQAUAFAH0z8nXafOBhJW8aj5pj9JQPYPmBt1HpqHovRmt3rsp9V08zUcQwQDd4o39of/b76oeJKW5HdjN1tZPhiLVZRBnmJItUJAjL8WkBa1cjWZVaRKxDiza5Fc6cm+UFioSEnWpY9z6kJMsiapW7KO8ifE1sxypE2zj5VRkmVM5GtZ7TZFIqYyW1T6Ikoi2Zrjas3Vjuiz2cwN2M7jwIfCDsz7+9V0J/0jma2Y4r2mX4YuTs94vOXbLuW31113qxyN6Q04Lw8pZxowNwakkSNijZlDDnuOh5j7vKvK+ktH+nyXH2X08vL5fsbMOTeqfVHhrnqTV13lrPBSGY/ttwpgPlEQ9n21HMfrD0513vROu2vspv4fg5HpDS/9SK+P5M0nEltXdlJs5DLODx4vpUJO0R2juHFab1g7LngnQmxuNGc1eoNkSOvSnkQoAKACgDcfk24PBiBP30YfKY8t76Xz32PkKDsei9Pjyqe9XVfyWeOdnMHNg2xeC0yAsdXsQp8YKvqpAuf970i3UaPBkwvLg7v469Sfs5wrAjh8eJxMS/SzP4yf8ZkXRf9I2oJaXDp1pVlyx+L+dFfB4Xh+Ix8SQIrRd05cWdRmB09qx2oFjhpcuoisatU76k/aJOFRLPCEVZ1RgoyymzlLpr7O5HlQS1S0WNShS3V59a4KvFezsP5qjxEcYEoSJ2YXuwIAe+v71/dQV5tJj/RrJFc0n+SrxzhMKcLw86xgSOY8za3N1Ynn5Cgr1GDHHRxmly65MZTOOFABQB1FIVYMpIZSCCNCCDcEedBKLcXaPs3Y7tEuMh8VhKmki9ejgdD9RuOlw9XodWtRC37S6/kpdpMcMGQzm0bmynkDa+UnruR1APQ1Rkls6nVxx39OpksT28ic5VesWXNJ9Cx4Wlycx8WD63rk5ISbtmeXBzNiQ1EFfBU2RpCN63RgkjPLIV5xaq3FWEZFF1JOlW9nwWOSOlBXc1RlxsguSOfHBedQx4nZbGJQefManl4iSlwW+H4UysEU25sd8qjdj93MkDnWfHDdIqjFydIccTxCxpZRZVGVRz/AP0SSSepNbbXyOlCCiqRV4TgSxztuacVfJb0OcNxeZSbgWI0FhYXGnncV01hhRl7SRo+zWKkbNnN1NtbbHkbCsev0mPNj7N9/wBn3P8A3cWYcklKxxItjY14PLilim4TVNHWjJSVojvVYzxxca006YNWfJu2nBThpboPm3N18jzX7vL0r1vo7VLPCpe0uv5OBqtP2U+OjK/CI+prXkjZjboZYzGhFNQjDkV2ZWbiUjm6qbelbViilyPaa2ukeOCgAoAKAPo35I9sT6xfZJQd70N0n8v5DsKL8KxQO15h8YEpLoS0HOkyJ/8Ad+xa4Nw58RwVIY8oZ72zEgeHFFjcgHkDQTwYZZtAoR6v/wCQk7FcPfD8TMLlSyI18pJGqKwsSByIoMmgwyw6twl1SD8oHZ2VZJcYSndsygC5z6qq6i1tx1oD0lpJqcs3FcfE2vB4lk4fBC50lgEfxiN/qBPup9x1sMVLTRg++NfYzHaiMrwfDqwsVaMEdCFcEUjBq01oYp+X8nzymcAKACgAoAu8G4pJhplmjOq7jkyndT5H7jyoLsGeWGanE+wsuH4lgyrDNFKtiPpKw+x1NiD5A7Umk1TPY6bUqcVlh/vI/O3aHs3NgcU0Egvl1RwNHQk5WHTaxHIgjzrFOG3hnV7ZTjYwwOMYDUVkyY76GGbQ2wszGq4abvKZNDWOawtU5RaMzjyVsTLeqorkklRxhavUhSIeIy2FD5JwFQTMajuSLXKiWeEi1hr9dQnyQuzUYHCdxFkPttYyHz5J6L9pPQVGtvqr5mzDj2q+8pdyZZLm2RSMvmban+nxqTXcaYmnwGCIUkDRbX8r7VaqXBFtXRX4hwPvGzpYE2zA7eZ9a2Y8tKmVShfKHGFwYRQq7D7etVSbk7JpUidkuLc1GnmOY92/xri+l9F2sO1gvWj91/X7GjBk2un0f7lY15U3nlMQv4zwxMRE0T7HY8wRsRWjTaiWCanEqzYlki4s+W4iKSCQxsLMpt69CPI16/FmjkgprozzeWDhJxfUc4DAd7bMKvi0jPuoeQ8CjAtlHwqEpcj3Mz9dk8mFABQAUAfRvyR7Yn1i+ySg73obpP5fyHYfw8JxTHb54+4QIPtBpLoS0HGjyN/937EvD8Y8PA1kjYq63sRbS+KIO/kTTHjySx+jlKLp/wD2EvYHFvLxHvJGLOyPcm2tlAG3kBSMno3JLJqt0nboh7e8XnOJmw5kJiDLZLCw8Kne19yaCPpLUZHlljv1eODT4jHdzguGy3sFkgzH91oZFf8A+JNB0ZZeywYZea/Zkv5UFAwYAFvnlPxDk0x+llWn+f5PlFB5kKACgAoAKAND2M7RnCS+IkwvYON7dHA6j6x7qDfoNY8E6fsvr+T6T2o4BFjoB7JdRmifcagaXH0WFvqPKqsuPevM9UpWrTPls3CwLoy5WU2IO4I3Fc5SadMplN2S4XCD4VN5EkR3E88FqpeS2RsoMLm1FFncNcAmWzcwQfhrUW10KdzTG3FuERYhb2sTqGG/XxdftrgPWZNLkcXzHw/B1OyjkipIy0nCTExUjUfjTyrpwyLKlKL4ME04umX+H4EJ8824/wAMfvc393Lz/hrRHhWX6aG57n0KfFcUfCg3dlX3E6/VUkuDePOGYHZQKOIRsk2aOYAIsY0+k39L/jpRp3vW59f9wVLl2KJOKrn7teSsxPohYfYPxt0Fj4si58lvhPERKt+f1/Vvv+LUpx2jjKy8RzFVkiHER/SGx+o15H0rouwyb4L1ZfZ+H4/o6GDLuVPqiu1ctFxzTAS9pOCiYBwPGnxK9P61u0WqeKW1vhnP1+m7SG6PVfsKeHxlTXYlq1FHnttjQ4qqv1jJbTIV7I8kFABQAUAbHsB2hgwgm74sM5S1lJ9nPfb1FB1vRuqx4FLe+tfyWO0PbCA4Y4XBxFFbQnKFUKTdgqg6k7Em25pFmq9IYnieLCqv5Fjs32nwSYKPDYgFrZsymPMpvKzr67g0E9LrNPHTrFk+arzsii4/gY8bHNCuSJYnVsseXxE6aDfTnQJavSwzqcOFTvgscc7QcMmjmIjBmdHCsYfFnyEIc3Kxtr5UE9RqtHkjJ16zT7u+hPx/j0MvD8PhkLd5GY8wKkDwxOpseepFBk1Oqxz00McXyq/Ysdpu1EWJwMUV274GMvdTa6owYg+poLNXrcebTKN+txZi6ZxwoAKACgAoAKAN7+TntPkIwkreFj80x5MfoHyPLz05iwdv0XrafYzfw/H4H3bjgRkU4iIfOIPGo+ko5jqw+sachWPU4bW+PU7eSF8owOGxNc5u0Z6JJp70RiSRFGutGSXA7LHfWFZLk3wQqxlwbiQb5onXdftI/r7z0rHrdK5R3m3TzpbBhj8OJQOTKd/K+orBo870+RqXsvr5ef8Av4Lc8FlS8UKsTJmO1gNAOgGw1/F716J5It33ChmxRW2xW2HBlQnky/aKkp26Lo5sb4TN3w6Lu1zkana9ZtRqJJpQXL4j5vx+C/3UjJ7nSIZW9o+tb8GNYoKC7vv4v5lncZlcRKZ5R48oEuW17ew2W3XlWxNUvkU82MOzEshDd5nvcWzgjlra/rRka7hwsf3vVZYVcfihEMzezcBrdCdx5jes+owRzQeOfR/6/kSjLa7RUfiEIF+9Sx28Q+zlXlMvorUwntUd3mun9G6OoxyV3REvFITtKnxqEvR2qS5gw/UY/eJPl8X7WP8A41++qXpc3uP6MfbY/eX1FePVAc6MpBOoDA2P3VrxY8rW2cWvimcbWYoRlvg1TE2LxoDb10Meke0wievZHjyxJgJVQSNFIENiHKMFIOxDEWN6Cx4sijucXXjRyMLJkMndv3YNi+U5L9M1rX1HxoF2c9u6nXj3HZ4fNcr3UlwucjI1wn65FvZ89qCXY5Lra+l9O7xI2wrhBIUcIxsHKnITroGtYnQ/A0EXjko7q48QxGHeM5XRkNr2ZSpsdjY8qAnCUHUlR1DhZGUusblF9pgpKr/EwFh76Bxxza3JOl3nvyGXT5qTVS48DaoN3Gmq+e1Adjk919L6d3iC4GUlQIpLuLoMjXYb3UW8Q8xQHZTtLa+enHU8iwcjOY1jcuLgoEYsLb3UC4tQCxTctqTvwPBhZC/dhHz3tkynPfmMtr3oF2c922nfh3nvyOS1+7e2bJfI1s/6l7e1+7vQPsp1dPrXz8PidPw6YOIzDIJG2Qowc77La52PwoG8ORS2uLvwo8+Qy+H5qTxEqvgbxMDYqumpB0sKBdlk49V8+R4mClOe0Tnu757IxyWvfPYeHY79DQCxTd0nx18viQUFYUAFAz632C7TfKY+6kPz0Y3P012zeo2PuPPQPT+jtZ20dsvaX38zN9vuzpgf5REPmXPiA+g5+xWPwOnMCsGfAk9yNs41yZMYm5sN/M2+uqVAIxskSRwxDAgjkajLGmRlDaTvIba1Q0kQQoxGNKMrAkFTcHoRtUrTVMmvI2vBeKidAw3GjDofuPL3jlXnNXpnjnS6d34NanavvLGLjBGf4/fT0uZr1H8jPmhfrIi4NgRLMM2ixjOx9PZHx+w11oOO2UpuklyyvEnuNDi576chtS0ON5ZfqMi8op9y/v8A3B0oKkUMTOAp15H7K6W7kmzIwiXvpms+Q97l3t7JCW/pV8ZLavkU07GvZbOobvbgk6ZuY02ualladUPHx1NMjVWWlLjovEw9KXUjL2TKrhR0poztkWNw1opCNwjW9cptRKmmmRbMZGuJkte4X7ax1hx81yUtoYYaOQaaiozyxaK6LD4JjrRHJwRZ7XoDyB9V4fIzRYeAm8b8OcsvK4EYB9bEj30j0+JtwhB9HD8C3CQj8zGIjxNFJiPdHMpH1Wo7jPCC/Q7O9pv6M8nxi/mv5Tf514VwfnZXYN7ytzQKWVfo+173Hb9w43Ev5pSK3ihiw85/95nX4+1R3DzxX6JQ70ov62Jvyj/9rH/kx/1pmP0r/wCcvgh32SgH5tlj+liBiCv+hFUfWKRs0UP/AAko+9u/YvdlIO9gw0h2+TYiA+pmjVB7wD8aC7Rx344SfutfdIqYa0eNiLbYPh4YjzVCG99noK41DURv/kx/79z2MBeI46BX7uTERjuZNrMUD2BGouST/poBUtVlxp05Lh/IyfEuMy/LhiJYwkkbpnVbjWMgEG51JAtQczLqJ/qVkmqaauvI3mKyJjcHAliHkxGJb1dJCh/5vhQdqTjHPjxx73KX1uv5KuHmaSThsjks/fYwZjvYM4A+AHwoK4ycpYZS63P+S1w/Ch4ID9KPGSSAcyoxTo/uHeA+6hFkIKUI+Km3/wC6n+5B2UjUSY3N/wCIxcsH/Csr/YTQivSJKWS/+aTX7s+XspBsdxofUb0zzjVOmeUCCgCfA4t4pFljbK6G4P43B2I6Ggsx5JY5KceqN1x3tgMTh1jjBUuPnvKx9hTzBte/Sw6gY9VlcfVR6jDq458acfmYfGYawB6lh8La/X9VZ4T4L065LXDpA1kfUDQHmv8A08qhNlm7dxIYtghz3rHORW1QlxvDgSS2ijeiHJKKvktdmBlcFb66EdRv/SoZ8SyeqwjJ7jWOcyEqbgg/jy/oRXFUFjy+t48/leX/AOF62vr0f2DhcgiCg6tM6iw6A6X9ASf9QrdDH+qyqH/TVX5vwBKCl6vw/sa4oV3mqNaEuIUbEaX+w3H2VRbTH1OIIF6eewNOLYUi1HhlOttiPojkb9KtUmR2oYI1SGVeMf4be77RS7yM/ZM+KaZmZ0QCLddKjN+qyEuh0uEUDYVyt1mKxeIRmOlSUeBplpMKLbVKK4JU2ZmvTHkD6NDxbDR4eKbv0MkeDMIiGrF2CHW21itvfSPQx1GKGKM9ytQqvPg7wvHMMBFhCYcvyLu2muNGK2aO/IEgG197UDhqcSrE6rZV/wAGXlxKHhaRZ17z5Vmy31C92wzEdLka0HOc4vRxhfO78mn4tx/DyDF4Ze6CjDAJKCLyMigol+dixsPWhnQy6vFLtMXHs8Px8hR26jhlb5RHiomISNO7U3fTc/X9VBl9Ixx5P/6xmnwlXeNeA8fw8CYKA90wKSGSQkXiL3Yi/K5NjQadPqsWOOLHx0dvwspcE43HDhFh7xbpjU56mIOjl/4dDrQVYNTDHh2buk/td2TnjkK4jiOIJjkusccaMQRILBXAH0l8Iv60E/1WOOXNktPhJLxDHzYTFSCQzRxTNh4WifOQsUqsxdWsbAgFAL9DQGSWDNPc5JS2qnfR/wCoznbfGxzYuR4iGWygsNmYKASPs91Bz/SGSGTO3D6+I9xHGIV4jg5u8UokCI7KbhSVlUg26ZgTQbZ6jGtVjnfCjT+5ehxmGSXCp8qiIw/ymZnB8J7xzlRereM6D9XzoL1kwxnCO9erud/Hu+5HwjtDEhwjd4oBlxfeAkXVJZGZC3TXIaCGLV408btdZX5JvgkwvaGCDIB3Une42Z2JIPdq0rKJfI5DcHoTQSjq8WOqp3N/Lnr9DC8dy/KZsjBlMjlSpuCpYkWPoaZxdTXbS2u1bKNBQFABQBc4dGxLMPZA19+3vqjOouNM6vorFknluPsrr/vEazcMJtmvooso1Jv4j6amsXZnpewZ5hsPY+zb1399VSi7oplBp0MZWK20uT01rPLGxuEnyJ+LYeV4zHGpLMwv0AA+8/VVuLFRdCHFE/DsBKplYWvkCrY7MVAJPS2tXPFzYnje5lrgKyK1nNlJK26+BrEdNQvrWTLpobXKS6DxY2pet0JI8ZH8sw6AEnVVNtLqt3uDqBqPivUVfo8MY400XKCVUaWS/wDtV7suFcsZvVLQzmFKEgLcZqxCJEY1JAQ8Ub5tvQfj8daO8jP2TN97STMzOWxI3qM+YshJcEOI4kApudh79ulcrFCUuKM20W8O43FIC6SBgNLc72vqDqBW6WCUOJE1Guou4n23SGQx2ZjYEkHmeVaMek3x3WWqCos11Tw4UAFABQAUAFAHq70DPKBBQAUAFABQAUAFABQAUAFABQBJh4S7BR/sOZNJulZdgwSzZFCPVlrg3HHMZRYCATvewAHizFgTnY2Gi3A61RKNuz2enxRwY1jh3fd+I0hgxkpzkG2pFg+3JSSgHPpRsRfvLacCnLZgLHQkaD0vrz2qLhfUN8S0nD5k0WMbaeMc99iTfzpdlfePtUitiZMoZZBk1sPaBJ3Au2h0t5a0dlTDeVeGSohcqwAJJ1K6DQXaxsCTsPLzocWO0e8J4ozksYWQZwFZmBzKCuYhfo6EnXXXnUMsLi0vASdlnCOEmDlLKhtmVQ7a30AjuQDob9LXtVOnhJYYp9Uhx4VGiGJQ2sy3PK49dqkWFdsu4YHW24IuN/f91RaGjgJURnqrrToR0HtUgK3F3+aY+n2il3kZ+yZSWe1JGdme7Q8TAidFILlSMoNyb3G2/X4Vbji3JCMNBHIXEjeECxzM1rDyZjqfLX0rbxVICfDYkKwLoQTcBozbNcWGYKbNqdbWNJxtBwOMPhJXGZlcm+6AOp8weXodRUaQ1Zp6uPBBQAUAFABQBruwEUZGKeSGOXuos4V1BFxmOlwbXtvQdX0bGG3JKUU6V8/M0fDuD4ZsVBMsCBMRhWkMRUMisDCbgEWGj20A286Rvx6bDLLGaiqlG67u78mX7BYWMnETSRrJ3EJdVYXUtYm5B/h+ug5/o7HBuc5K9quh7iXw8c+Ek+RwsMbHEGQquVGZkuygqRez25Xyig2SeKOTHLs166XHh9vMnMOFl4kMKcLCiwhm8KqO8JRCFZQouBcm2u1BPbhnquy2Jbee7nj4GW7V4zDypEyRLDiFLLNGiFVBBsL6AEi31+VBzdbPFOMWlU+9JGbpnOCgAoAKACgAoA9RSSAASSbADUknYAUDSbdI0HD+A4r5xThm1VcrMYwCcwJAD2ZTp0toKrabZ630fpY6bH63tPr+B5w7h+NhJYRI2n60ZcDkAS3Pp150JNdxubi+88xfaV4rCW0bGwCuSGubWFifPlcVHr1Q9vgxHje3EmbJH3bMeQYDYXJJZdttr7ik4oVMVntHiZb5p1UWNo4S7PpqQDHHe1gduegPQ2jojw+GuCxw+L85JMPPnJJGubJ7IsNz5nrTUWiXBXx3aGCJGWLNiJrhe7Oh9k5yUAvaw1Op15a01GxXQy4dinZxEiqrBbm6gqLsuco5vbUeydQRsRYVFkkQcX7QI4eOJrvGrOLIWUqh1ITMLsbMQ1/o+ekVEbYvGPk7nMJCWLaBgGbxMcylBbW30bbKTRVSoV8FOPiktrtEI8qkswCqgte50Um4FuY02p7Q3MlwfE4zsc2UZ/CGUNdr6XfrrzBsabjXUVnH51xWRu7kjRwgcnMxA8RBHikZRbS5Omml70tqTHboWYrjHEPEpx3LTLkU38JAOUeHfnapKEPAjul4laTtHxEAx980lxbNoy7hvpDRtLfHTnT7OHgJyl0K35wmlur4jxHTLmRRpY6lba6dKFjiuiI2V5ILF1yu3NiTmsQQfFdPCd7g+dSoC5h7MbuSinV8hAcm+5Ow1zX2Ol+tDQxj3GHAEpzgksLPEoe+hTwmUZrHUaG/uqNvoOkV1kwyaNIVNybCFhz55XIvp9lS5FSNPUzwYUAFABQAUAbT8nMgVcYzKHCwXKnZgA5KnQ6HbbnQdf0W0o5W1fHT6jHsfxxsVj8xVURMOyoi+yq5o/8Ap02FLvNGi1Tz6i6pKPC+go7Bf4OO/wDTH/legzejvYzf+n8l/i/t8G/hg+2GguzddN8F/BU45h8Q3FZnwy3kiKybqLBY4wScxFxrYjnegq1EMr1spYuqp/ZEfbiFJUgx8Yy/KBZ16Oul/PYi/wC6DzoI+kIxnGGoj/zdfiZGmcoKACgAoAKACgDb9gOEJriHbxDSMDXLyLN0PTpvz0qnLuPQei9FSWaff0/P4Nw6J1v11tVZ3CrPMsa3Zgqj6Tab8gOfrapwTXLIvnofMe2kz8QxkcUEStHCpDPIl1N5EbLc628J0HWm5p8jiqL3BvyfYeMl3TvmY5rSLdAf3Yycvx5VDtvBDo18UDItlIjUW2CooA9LUt2SQnQt4p2kiw6lzIGbqxso9CdW91WKW1cuyD56FnhOIWWJD4WLAEsALMTqTV0XaIPhlbG9no5DdibkqzZfDmy3yqba5Rc6edLYrsmpuqMRxgx4fFN3aLooMoHLvmKupA3bLc63sGPWqpruRdB8GZxfE5oTiUlAe0hC6A/OWIQ67DKu3Q250VYXQlzK0CySM3zpYOFAFlQi1tLLck/gVJdaI3wXWx2HCQjMQbd5mKi4YFsg8It0P1VF3bJKqKUPFhcssQHerZ0XMbm7EsF9QDffQU9otxYfhJlZFiDgWXKoXNYkDNm0FgNNW12vQn4iY2X8n+KsD3kGgBAObTqNtfU9KHOK6kUzr9GpQAJIg2QsbxtbSwsCBY2FuW55dI9ou5kkg7UcJlIBBCoUJCqhBuRY5+R+lr6eVlGSJOJHhODTDDjLGVkNirFQCFYi17qSTvYcrX3ykNyVglwWZey7SlI5sVyzWyXb0Y3sp3+I33p7vBBXiaLA9m8MEUBUcAWBktmt022qmUnZNJULa1nz4KACgAoAKAGnBuNNh1mVVVu+Qxm99AQRcW560GrT6l4YySXtKg7OcabCS96iqxKlLNe1iVN9PSgNLqXp57kr4oZp2ydZRImHhQZCjoq2V1JB8VuYtofM9aRoXpJqalGCXFNeJT4l2kkmxEU5VQIShSNbhQEYMB77UyrLrZZMsZtez0R3H2plXGNjFVQzizLqVK5VBG9/og+ooGtdNZ3mS69xF2g7QPiQi92kUcYORIxZRe1z9VBHVauWelSSXRITUGMKACgAoAKAHHBuzk+IjeVAoSO1y1xmPMLYakafGozdKzqejdF2098/ZX38vyaDgeAnw1zGiXc3cEnU2Av66CqoNSPUSo7x/GcSp7tjkJBN/DqKfKJJRfQq4Lhk0y3kcjnqxZt/PahRb5YOSXCGvCuHrh8xVy2bXxagenSnuguGQabLcuJcjwvl8wooU4dwmmZbtLg8e0ZOHkVmvc3F2y2NwubS+2+lS233ivxPnmE7OTOwmxgd/Ecyu+QqRf19dNKTaTomo8G+h46sKrHGBbYDYKPMnU/Cob5Lp0JdnDvMvx/txiZD3ML91bdlUN4b2vcXKjY36VYnJ9SNRRk+K4iNpAsLF5JSA7CRt1trcnc60JUgbHhjEoQNl70KVkUqXLJHYCQeIDNlsCb9DyqHQn1JuC9gnxqXjkaCJGITvVuXUnMHtpca6X6VOHPVlcuOiNG/5IoygVsQikG+ZFsx/iLE3qaXmJy8iWbsJAgVflJRUBHgVQ2tvpG99ufWk4xXVi3y7kV8DwHCxSq0UmIdlOlyhjBuGN7JfkBvUJbF3klKbfQ0WO4jEkd3BEuUsbajyzX2PmKqlFTJVQlj7RjumlRbst9iL6b1X2STLIvgz+O7aqhVD85nJOwuoJGluflVqx95FzKHHOMze2CCu4S5uLbf7VNJCbFMvHxIELO992jQAAtyBbexp0KzvC9pcTY2mjSzEZWXUeQ8qTihWamrTwZNh3QXzozdLPlt1+ib0FkHBe0r+dE3fQfsX/nD+3SJ78Xuv6/0HfQfsX/nD+3QG/F7r+v9B30H7F/5w/t0Bvxe6/r/AEHfQfsX/nD+3QG/F7r+v9Homg/Yv/OH9ugN+L3X9f6PO+g/Yv8Azh/boDfi91/X+g76D9i/84f26A34vdf1/oO+g/Yv/OH9ugN+L3X9f6DvoP2L/wA4f26A34vdf1/oO+g/Yv8Azh/boDfi91/X+g76D9i/84f26A34vdf1/oO+g/Yv/OH9ugN+L3X9f6OZZYiDliYHkTKCB7sgv8aYpSx1xH7/ANE/AOEtiZliBCru7HZVG513PIDqaCel07z5FHu7/gfV+LTwYTAuEKhIk0AIJ3F/Ukm/vqMlao9bijCEVCHRHzZ+3LM2VUyi2hJ1+FVdOhbtvqLsNxIySiZyWtYEtyF9QByFK76lqVLg2nDZYmZ3jlzhrXF9BpsKnkVx4K49eS7Lrby3FZC0hmNjpvTZE5ZjcEaaainGTT4E1Yn7fxocG0rHKY8rX9GFbJK+SuLpnyHD8QjzSuzljrY6g+7pyqqSdpFiYkn4kxZmWyZxlIB1t0vVyKxhwaHEAqyRhQfEGZQFIXViCRrUW0Tima7s81i888wJbQE2sCQNBaq5USiPMX2hyLYzILkZbIXvryAqO0luI5sTjyfBLCUOt+58Q8vb3qVRFul4kGCxLuGLSliGy2K5Bf0oaQWxl8sYDKoAZRoNqjS7xvyM7xbEzOhY3zEajl76aa7hNGJOInjbwkrmFjbbXr0q1JFbs54SzmbvD9EEkkcgPx8KbYiWKafK7XI1BF99TsPjRwBUw+ClLGynMDdrjQeZP3U7QUNxYFro5a/itltewGl6raJI2VWnggoAscPlCyxs3sq6E+gYE/VQWYpKM4t9LQzgxWHsPBGDoWzIxFzFlNt/CG8VvPS9I1xyYeOF9PL8/wBHSHDKVDCM6RnTvdLxAyZtDc5iLADkQctALsU0nXd4+HN/Pp/BXgmjRbgqSCX2O6R5YdDzzuxYXt4elqCEJQir48fouPu+Sz8ow9lAyWBcrdZNLmC2e275VlGmlyPcE9+Hjp3+Pl18+vkS4p8OSxIDMwuoJbcuWQaXAzA2I8NrjroFk3hb55b6dfG19flRDPHhlWQDKcpZASWLse7JBGU5RZyBfYheetwrlHBGLru48+n5OmxWG7zOQjXkJN1cnxSsbkHTIIyBYa5ht1BvJg3buHz4Px/avuVW+T3ivlsD84F7zUXTmQDzY26De5AAVvsW4/er8iSJ8NpnCHxLmyiQX8Ud8l9ly95cHW505WBp4O+uvn5dPKrOVxMNswVVdFUiwbVyjK3tEjRyjD+E0B2mLqlTS+9fw6YopmIKACgZy40Ol6jLobPR3/Ew+It+SxqyvJIQb2C3NuY251VbPZFjHSLlyQg3bdr7DnToLK8XEWwzaMxyj489bb0wNf2e/KFDMvzqmJhprqD53G3vocU+qIW+4fSdocINWlUepFLs4BciPEdqMJEneGRbW01+ypKMY9BcswXHu054gCoXLh1INja8hGo05Lex58qk5Aol3ss3D4IyZYkVtSS4B09dbD4VCyVE47b8LUkBRp0jb+gqXJCiWXt9gm0SN38hG39RQg5PcN2qgnAjjwzA/vJYCoNBTYs4pMUUtZQQdLgUFlFOHFYgx5u8RBe+1yfI0UOzvBh5pMxzKQwJtopFJ8KgXLHMUiBpOotr7tfsqG0lZX4rxiKVGVBsuump8qagJyEaYgKinucxt4tvx9tDXI74OZ8VDssRVm5AAf0qSsjwcvEiRRtItxmBN9+dtvdS3chtGXdxGMhXtJLY8tgdvqNPcFDIcHw7gM5ysRqL2o3CoqVeeBCgAoAKACgAoA9XegZ5QIKACgAoAKACgAoAKACgCLFMQjFd7aVGXQ2+jv8AiYfEzWIxGmY623v1G9QR7FnuI4iyIGQ6n8fCnQmymccsmsjWP46U6CyYcRhEZC7jnTojZXTGNIwuSR+N6VDTLnGkhlKI0uUgbbb+7ypoGKcXhu6YIk5N97HTXyFAhlgioyByXJIve5qDJpD/ABPCkfxIBc+VMCTE4OUIAihCNyRSTQMjwkogjJ7wFzqSfuofILggwvEUZWleQtyF9B6bUmh2Up+KP+zBXe/L4VKiNjThXEc4uWHoLUmh2VG4pkzlRqdBfrToVkKYeSQC7Bb7/g0NAS/nL5P4HGYnY8qjVjujgXdu8tcn4CmkKzU4Thad0GmIsoBsOvuqtLlk27RmsRgAcSpUlRvqfhY9PvNTS4Ij0PKL+Jd9PTzqNDOa0HgAoAKACgAoAKAPV3oGeUCCgAoAKACgAoAKACgAoAr8QkKxuwF7Db30n0Nmg/4mHxFuJ4T3g7wNow1Hu0tVSZ7IX47CNoi7X11+FSixNHE3BGVLql9P9qdiozWKiKHKRY1JEWT8MxBU6HQ0NDshxs2di1rUUIjhRiQQDv00pga3geIZWyvGDtraq2ixMc4/iZWVdQq26XqNDLOFx7SAq7XDeybWNqKCxVxrB/8Ad6AAb6a1JAyGDgxkiWMIQCdTpe17m1FkRnjOD5EAUE6fVQmKinBDkACLTY0jmHhxJLkak60ITDFd2l0ZvE22vwoY7FHE47IBe9rEEnlt99JIVkcnFjYJEjctQDToDTxYqTuwrHa2nOoUSIscpbxE62sLD7tRQkDZch4QWANzStD5P//Z",
];

const readImgKey = (b: any): string | null =>
  b?.imageUrl ?? b?.image ?? b?.img ?? b?.path ?? b?.filePath ?? b?.url ?? null;

function forceExtimgProxy(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  let u = raw.trim();
  if (!u) return null;

  if (
    u.startsWith("/uploads/") ||
    u.startsWith("/server/uploads/") ||
    /^\.?\/?uploads\//i.test(u)
  ) {
    return u
      .replace(/^\.?\/?/i, "/")
      .replace(/^\/server\/uploads\//i, "/uploads/");
  }
  if (u.startsWith("/extimg/")) return u;

  if (/^https?:\/\//i.test(u)) {
    try {
      const url = new URL(u);
      const scheme = url.protocol.replace(":", "");
      const path = url.pathname.replace(/^\/+/, "");
      return `/extimg/${scheme}/${url.hostname}/${path}${url.search}`;
    } catch {
      return u;
    }
  }
  if (u.startsWith("//")) {
    try {
      const proto =
        typeof window !== "undefined" && window.location?.protocol
          ? window.location.protocol
          : "https:";
      const tmp = new URL(proto + u);
      const scheme = tmp.protocol.replace(":", "");
      const path = tmp.pathname.replace(/^\/+/, "");
      return `/extimg/${scheme}/${tmp.hostname}/${path}${tmp.search}`;
    } catch {
      return u;
    }
  }
  if (/^[a-z0-9.-]+\//i.test(u)) {
    return `/extimg/https/${u.replace(/^\/+/, "")}`;
  }
  return u.startsWith("/") ? u : `/${u}`;
}

const toImgUrl = (b: any): string =>
  forceExtimgProxy(readImgKey(b) || "") || "/placeholder.svg";

const AdvertisementBannerCarousel: React.FC<
  AdvertisementBannerCarouselProps
> = ({ onBannerClick }) => {
  const [banners, setBanners] = useState<BannerAd[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultSlides = useMemo<BannerAd[]>(() => {
    const bannerData = [
      {
        title: "ADVERTISE\nYOUR\nResidential Project\nHERE",
        description: "Prime Properties • Verified Listings • Best Deals",
        type: "residential",
      },
      {
        title: "ADVERTISE\nYOUR\nCommercial Project\nHERE",
        description: "Commercial Spaces • Offices • Retail Shops",
        type: "commercial",
      },
      {
        title: "ADVERTISE\nYOUR\nInvestment Project\nHERE",
        description:
          "Investment Opportunities • Guaranteed Returns • Land Deals",
        type: "investment",
      },
      {
        title: "ADVERTISE\nDeen Dayal Jan Awas\nYojana Project\nHERE",
        description: "Affordable Housing • Government Schemes • Low EMI",
        type: "ddjaay",
      },
    ];

    return FALLBACKS.map((src, i) => {
      const banner = bannerData[i % bannerData.length];
      return {
        _id: `ad-default-${i + 1}`,
        title: banner.title,
        description: banner.description,
        imageUrl: src,
        link: "",
        sortOrder: i + 1,
        position: "advertisement_banners",
      };
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/banners?position=advertisement_banners&active=true&t=${Date.now()}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const incoming: any[] =
          (Array.isArray(data?.data) && data.data) ||
          (Array.isArray(data?.banners) && data.banners) ||
          (Array.isArray(data) && data) ||
          [];

        const cleaned = incoming
          .map((x) => ({
            ...x,
            imageUrl: toImgUrl(x),
            sortOrder: typeof x?.sortOrder === "number" ? x.sortOrder : 999,
          }))
          .filter((x) => !!x.imageUrl)
          .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

        console.info(
          "[AdvertisementBannerCarousel] loaded",
          cleaned.length,
          "banners",
        );
        setBanners(cleaned.length ? cleaned : defaultSlides);
      } catch (e: any) {
        console.warn("Advertisement banner fetch failed:", e?.message || e);
        setError("Unable to load advertisement banners");
        setBanners(defaultSlides);
      } finally {
        setLoading(false);
      }
    })();
  }, [defaultSlides]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect as any);
    };
  }, [api]);

  useEffect(() => {
    if (!api || banners.length <= 1) return;
    let paused = false;
    const root = document.querySelector(".advertisement-carousel");
    const onEnter = () => (paused = true);
    const onLeave = () => (paused = false);
    root?.addEventListener("mouseenter", onEnter);
    root?.addEventListener("mouseleave", onLeave);

    const id = setInterval(() => {
      if (!paused) {
        if (api.canScrollNext()) api.scrollNext();
        else api.scrollTo(0);
      }
    }, 6000);

    return () => {
      clearInterval(id);
      root?.removeEventListener("mouseenter", onEnter);
      root?.removeEventListener("mouseleave", onLeave);
    };
  }, [api, banners.length]);

  const handleBannerClick = (b: BannerAd) => {
    // Determine banner type from position in array or title
    const index = banners.indexOf(b);
    const types = ["residential", "commercial", "investment", "industrial"];
    const bannerType = types[index % 4] || "residential";

    if (onBannerClick) {
      onBannerClick(bannerType);
    }
  };

  const go = (i: number) => api?.scrollTo(i);

  if (loading) {
    return (
      <div className="advertisement-carousel relative w-full h-64 bg-gray-200 animate-pulse" />
    );
  }

  return (
    <div
      className="advertisement-carousel relative w-full overflow-hidden bg-black"
      style={{ height: "clamp(16rem, 40vw, 28rem)" }}
    >
      <Carousel
        opts={{ align: "start", loop: true }}
        setApi={setApi}
        className="w-full h-full"
      >
        <CarouselContent className="h-full -ml-0">
          {banners.map((b, i) => (
            <CarouselItem
              key={b._id || i}
              className="h-full basis-full pl-0 cursor-pointer"
              onClick={() => handleBannerClick(b)}
            >
              <div className="relative w-full h-full">
                <img
                  src={b.imageUrl!}
                  alt={b.title || `advertisement-${i + 1}`}
                  className="w-full h-full object-contain block bg-black"
                  loading={i === 0 ? "eager" : "lazy"}
                  onError={(e) => {
                    console.warn(
                      "Advertisement banner image failed:",
                      (e.currentTarget as HTMLImageElement).src,
                    );
                    (e.currentTarget as HTMLImageElement).src =
                      FALLBACKS[i % FALLBACKS.length] || "/placeholder.svg";
                  }}
                />
                {/* Enhanced Overlay for better text visibility */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/65 via-black/50 to-black/65" />
                <div className="absolute inset-0 z-10 flex items-center justify-center px-4 md:px-8">
                  <div className="text-center text-white max-w-4xl mx-auto">
                    <h2
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4 drop-shadow-2xl whitespace-pre-wrap"
                      style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}
                    >
                      {b.title || "Advertise Your Project"}
                    </h2>
                    {b.description && (
                      <p
                        className="text-sm sm:text-base md:text-lg lg:text-xl text-white/95 drop-shadow-xl"
                        style={{ textShadow: "1px 1px 4px rgba(0,0,0,0.8)" }}
                      >
                        {b.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {banners.length > 1 && (
          <>
            <CarouselPrevious className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/25 hover:bg-white/35 text-white border-none backdrop-blur z-20" />
            <CarouselNext className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/25 hover:bg-white/35 text-white border-none backdrop-blur z-20" />
          </>
        )}
      </Carousel>

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === current
                  ? "bg-white scale-110"
                  : "bg-white/60 hover:bg-white/80"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="absolute top-3 right-3 z-40 text-xs bg-red-600/90 text-white px-2.5 py-1.5 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default AdvertisementBannerCarousel;
